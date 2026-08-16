import type { ResourceService } from './resource.service.js'
import type { ResourceType } from '../models/resource.model.js'
import { classifyResourceDomain } from '../utils/classifyResourceDomain.js'
import { groupResourcesForExport } from '../utils/groupResourcesForExport.js'
import { buildResourcesExportWorkbook } from '../utils/resourceExcelBuilder.js'
import type { ResourceExportRow, ResourceExportSheet } from '../utils/resourceExcelBuilder.js'

export type ResourceExportType = 'all' | ResourceType

const SHEET_NAME_BY_TYPE: Record<ResourceType, string> = {
  api: 'APIs',
  'web-service': 'Web Services',
  site: 'Sites',
}

const ALL_TYPES: ResourceType[] = ['api', 'web-service', 'site']

/**
 * Só monta a exportação — toda a regra de consulta/filtro do catálogo continua em
 * `ResourceService.listResources`, reaproveitada aqui sem duplicação. Consolidação
 * HML/PROD (`groupResourcesForExport`) e classificação de domínio
 * (`classifyResourceDomain`) também vivem em módulos próprios — este service só
 * orquestra as três coisas e entrega linhas já prontas para o Excel builder.
 */
export class ResourceExportService {
  constructor(private readonly resourceService: ResourceService) {}

  async exportToExcel(type: ResourceExportType): Promise<Buffer> {
    const types = type === 'all' ? ALL_TYPES : [type]

    const sheets: ResourceExportSheet[] = types.map((resourceType) => ({
      name: SHEET_NAME_BY_TYPE[resourceType],
      rows: this.buildRows(resourceType),
    }))

    return buildResourcesExportWorkbook(sheets)
  }

  private buildRows(type: ResourceType): ResourceExportRow[] {
    const resources = this.resourceService.listResources({ type })
    const groups = groupResourcesForExport(resources)

    const rows = groups.map((group): ResourceExportRow => {
      // Classificação sempre a partir do lado Homologação quando existe: é o que
      // preserva a grafia original (camelCase) vinda da ingestão — o lado Produção,
      // quando promovido, tem `technicalName` regerado via slugify e perde essa
      // informação (ver `classifyResourceDomain`).
      const classificationSource = group.homologacao ?? group.producao ?? group.representative

      return {
        code: group.representative.code,
        name: group.representative.displayName ?? group.representative.name,
        type: group.representative.type,
        domain: classifyResourceDomain(classificationSource),
        active: group.representative.active,
        responsible: group.representative.responsible,
        urlHomologacao: group.homologacao?.url,
        urlProducao: group.producao?.url,
      }
    })

    return rows.sort((a, b) => {
      const domainCompare = a.domain.localeCompare(b.domain, 'pt-BR')
      if (domainCompare !== 0) return domainCompare
      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }
}
