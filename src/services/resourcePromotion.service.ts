import type { ResourceRepository } from '../repositories/resource.repository.js'
import type { ResourceService } from './resource.service.js'
import type { Resource } from '../models/resource.model.js'
import type { CreateResourceInput } from '../validators/resource.schema.js'
import { env } from '../config/env.js'
import { generateResourceId, slugify } from '../utils/slugify.js'
import { substituteResourceDomain } from '../utils/substituteResourceDomain.js'
import { normalizeSearchTerm } from '../utils/normalizeSearchTerm.js'

const ENVIRONMENT_LABEL_TOKENS = new Set(['homologacao', 'producao', 'desenvolvimento', 'unknown', 'desconhecido'])

export type PromotionItemStatus = 'created' | 'skipped' | 'error' | 'rolled-back'

export interface PromotionReportItem {
  sourceId: string
  name: string
  status: PromotionItemStatus
  targetId?: string
  reason?: string
}

export interface PromotionReport {
  success: boolean
  totalFoundInHomologacao: number
  created: number
  skipped: number
  failed: number
  rolledBack: boolean
  items: PromotionReportItem[]
  errors: string[]
}

export class ResourcePromotionService {
  constructor(
    private readonly repository: ResourceRepository,
    private readonly resourceService: ResourceService,
  ) {}

  promoteHomologacaoToProducao(): PromotionReport {
    const sourceResources = this.repository
      .findAll()
      .filter((resource) => resource.environment === 'homologacao')

    const items: PromotionReportItem[] = []
    const createdIds: string[] = []
    let skipped = 0

    try {
      for (const source of sourceResources) {
        let item: PromotionReportItem
        try {
          item = this.promoteOne(source)
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error)
          items.push({ sourceId: source.id, name: source.name, status: 'error', reason })
          throw error
        }

        items.push(item)

        if (item.status === 'skipped') {
          skipped++
        } else if (item.status === 'created' && item.targetId) {
          createdIds.push(item.targetId)
        }
      }
    } catch (error) {
      for (const id of createdIds) {
        this.repository.remove(id)
      }
      for (const item of items) {
        if (item.status === 'created' && item.targetId && createdIds.includes(item.targetId)) {
          item.status = 'rolled-back'
          item.reason = 'Revertido: a operação em lote foi abortada por um erro em outro recurso.'
        }
      }

      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        totalFoundInHomologacao: sourceResources.length,
        created: 0,
        skipped,
        failed: 1,
        rolledBack: true,
        items,
        errors: [`Operação abortada e revertida — nenhum recurso foi mantido: ${message}`],
      }
    }

    return {
      success: true,
      totalFoundInHomologacao: sourceResources.length,
      created: createdIds.length,
      skipped,
      failed: 0,
      rolledBack: false,
      items,
      errors: [],
    }
  }


  private promoteOne(source: Resource): PromotionReportItem {
    if (!source.url) {
      throw new Error(
        `Recurso "${source.name}" (${source.id}) não possui URL cadastrada — não é possível derivar a URL de Produção.`,
      )
    }

    const targetId = generateResourceId(source.type, 'producao', slugify(source.name))
    if (this.repository.findById(targetId)) {
      return {
        sourceId: source.id,
        name: source.name,
        status: 'skipped',
        targetId,
        reason: 'Já existe um recurso equivalente em Produção.',
      }
    }

    const url = substituteResourceDomain(
      source.url,
      env.resourceDomains.homologacao,
      env.resourceDomains.producao,
    )
    const docUrl = source.docUrl
      ? substituteResourceDomain(source.docUrl, env.resourceDomains.homologacao, env.resourceDomains.producao)
      : source.docUrl

    const input: CreateResourceInput = {
      name: source.name,
      type: source.type,
      url,
      environment: 'producao',
      active: source.active,
      description: source.description,
      docUrl,
      responsible: source.responsible,
      area: source.area,
      notes: source.notes,
      category: source.category,
      code: source.code,
      keywords: source.keywords.filter(
        (keyword) => !ENVIRONMENT_LABEL_TOKENS.has(normalizeSearchTerm(keyword)),
      ),
      tags: source.tags,
    }

    const created = this.resourceService.createResource(input)

    if (source.displayName) {
  
      this.repository.update(created.id, { displayName: source.displayName })
    }

    return { sourceId: source.id, name: source.name, status: 'created', targetId: created.id }
  }
}
