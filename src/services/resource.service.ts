import type { ResourceRepository } from '../repositories/resource.repository.js'
import type { Resource, ResourceEnvironment, ResourceType } from '../models/resource.model.js'
import type { ResourceSummary } from '../types/resourceSummary.type.js'
import type { CreateResourceInput, UpdateResourceInput } from '../validators/resource.schema.js'
import { ApiError } from '../utils/ApiError.js'
import { normalizeSearchTerm } from '../utils/normalizeSearchTerm.js'
import { generateResourceId, slugify } from '../utils/slugify.js'
import { generateKeywords, generateSearchIndex } from '../utils/generateKeywordsAndIndex.js'

export interface ResourceQuery {
  type?: ResourceType
  environment?: ResourceEnvironment
  search?: string
}

/**
 * Regras de negócio do catálogo: filtragem, ordenação e agregações.
 * Não conhece Express — recebe e devolve apenas tipos de domínio, o
 * que permite reutilizar esta classe em qualquer camada de entrega
 * (HTTP hoje, CLI ou fila no futuro, se necessário).
 */
export class ResourceService {
  constructor(private readonly repository: ResourceRepository) {}

  listResources(query: ResourceQuery = {}): Resource[] {
    const resources = this.repository
      .findAll()
      .filter((resource) => this.matchesQuery(resource, query))

    return [...resources].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  getResourceById(id: string): Resource {
    const resource = this.repository.findById(id)
    if (!resource) {
      throw ApiError.notFound(`Recurso não encontrado: ${id}`, 'RESOURCE_NOT_FOUND')
    }
    return resource
  }

  getSummary(): ResourceSummary {
    const resources = this.repository.findAll()

    return {
      total: resources.length,
      apis: resources.filter((resource) => resource.type === 'api').length,
      webServices: resources.filter((resource) => resource.type === 'web-service').length,
      sites: resources.filter((resource) => resource.type === 'site').length,
    }
  }

  createResource(input: CreateResourceInput): Resource {
    this.assertNoDuplicate(input.name, input.url)

    const technicalName = slugify(input.name)
    const id = generateResourceId(input.type, technicalName)
    const keywords = generateKeywords({
      name: input.name,
      description: input.description,
      keywords: input.keywords,
    })
    const now = new Date().toISOString()

    const resource: Resource = {
      id,
      type: input.type,
      name: input.name,
      technicalName,
      code: input.code,
      url: input.url,
      environment: input.environment,
      category: input.category,
      deprecated: false,
      active: input.active ?? true,
      description: input.description,
      keywords,
      tags: input.tags ?? [],
      searchIndex: generateSearchIndex({
        name: input.name,
        technicalName,
        code: input.code,
        url: input.url,
        description: input.description,
        keywords,
        tags: input.tags ?? [],
        type: input.type,
        environment: input.environment,
      }),
      docUrl: input.docUrl || undefined,
      responsible: input.responsible,
      area: input.area,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    }

    return this.repository.create(resource)
  }

  updateResource(id: string, input: UpdateResourceInput): Resource {
    const existing = this.getResourceById(id)
    this.assertNoDuplicate(input.name, input.url, id)

    const name = input.name ?? existing.name
    const description = input.description ?? existing.description
    const keywordsInput = input.keywords ?? existing.keywords
    const technicalName = input.name ? slugify(input.name) : existing.technicalName
    const type = input.type ?? existing.type
    const environment = input.environment ?? existing.environment
    const code = input.code ?? existing.code
    const url = input.url ?? existing.url
    const tags = input.tags ?? existing.tags

    const keywords = generateKeywords({ name, description, keywords: keywordsInput })

    const patch: Partial<Resource> = {
      ...input,
      docUrl: input.docUrl === '' ? undefined : (input.docUrl ?? existing.docUrl),
      technicalName,
      keywords,
      searchIndex: generateSearchIndex({
        name,
        technicalName,
        code,
        url,
        description,
        keywords,
        tags,
        type,
        environment,
      }),
      updatedAt: new Date().toISOString(),
    }

    const updated = this.repository.update(id, patch)
    if (!updated) {
      throw ApiError.notFound(`Recurso não encontrado: ${id}`, 'RESOURCE_NOT_FOUND')
    }
    return updated
  }

  deleteResource(id: string): void {
    this.getResourceById(id)
    this.repository.remove(id)
  }

  private assertNoDuplicate(name: string | undefined, url: string | undefined, excludeId?: string): void {
    if (!name && !url) return

    const resources = this.repository.findAll().filter((resource) => resource.id !== excludeId)
    const normalizedName = name ? normalizeSearchTerm(name) : undefined
    const normalizedUrl = url ? url.trim().toLowerCase() : undefined

    if (normalizedName) {
      const nameExists = resources.some(
        (resource) => normalizeSearchTerm(resource.name) === normalizedName,
      )
      if (nameExists) {
        throw ApiError.conflict(
          'Já existe um recurso cadastrado com este nome.',
          'RESOURCE_DUPLICATE_NAME',
        )
      }
    }

    if (normalizedUrl) {
      const urlExists = resources.some(
        (resource) => resource.url?.trim().toLowerCase() === normalizedUrl,
      )
      if (urlExists) {
        throw ApiError.conflict(
          'Já existe um recurso cadastrado utilizando esta URL.',
          'RESOURCE_DUPLICATE_URL',
        )
      }
    }
  }

  private matchesQuery(resource: Resource, query: ResourceQuery): boolean {
    if (query.type && resource.type !== query.type) return false
    if (query.environment && resource.environment !== query.environment) return false
    return this.matchesSearch(resource, query.search)
  }

  private matchesSearch(resource: Resource, search: string | undefined): boolean {
    const normalized = search ? normalizeSearchTerm(search) : ''
    if (!normalized) return true

    const words = normalized.split(/\s+/).filter(Boolean)
    return words.every((word) => resource.searchIndex.some((entry) => entry.includes(word)))
  }
}
