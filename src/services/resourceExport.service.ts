import type { ResourceService } from './resource.service.js'
import type { ResourceType } from '../models/resource.model.js'
import { buildResourcesExportWorkbook } from '../utils/resourceExcelBuilder.js'

export type ResourceExportType = 'all' | ResourceType

const SHEET_NAME_BY_TYPE: Record<ResourceType, string> = {
  api: 'APIs',
  'web-service': 'Web Services',
  site: 'Sites',
}

const ALL_TYPES: ResourceType[] = ['api', 'web-service', 'site']

/**
 * Só monta a exportação — toda a regra de consulta/filtro do catálogo continua em
 * `ResourceService.listResources`, reaproveitada aqui sem duplicação.
 */
export class ResourceExportService {
  constructor(private readonly resourceService: ResourceService) {}

  async exportToExcel(type: ResourceExportType): Promise<Buffer> {
    const types = type === 'all' ? ALL_TYPES : [type]

    const sheets = types.map((resourceType) => ({
      name: SHEET_NAME_BY_TYPE[resourceType],
      resources: this.resourceService.listResources({ type: resourceType }),
    }))

    return buildResourcesExportWorkbook(sheets)
  }
}
