import type { NextFunction, Request, Response } from 'express'
import type {
  ResourceExportService,
  ResourceExportType,
} from '../services/resourceExport.service.js'
import { ApiError } from '../utils/ApiError.js'

const RESOURCE_EXPORT_TYPES: ResourceExportType[] = ['all', 'api', 'web-service', 'site']

function parseExportType(value: unknown): ResourceExportType {
  if (value === undefined) return 'all'
  if (RESOURCE_EXPORT_TYPES.includes(value as ResourceExportType)) {
    return value as ResourceExportType
  }
  throw ApiError.badRequest(
    `Parâmetro "type" inválido: "${String(value)}". Valores aceitos: ${RESOURCE_EXPORT_TYPES.join(', ')}.`,
  )
}

function buildExportFilename(): string {
  const today = new Date().toISOString().slice(0, 10)
  return `portal-servicos-recursos-${today}.xlsx`
}

export class ResourceExportController {
  constructor(private readonly service: ResourceExportService) {}

  export = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const type = parseExportType(req.query.type)
      const buffer = await this.service.exportToExcel(type)
      const filename = buildExportFilename()

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(buffer)
    } catch (error) {
      next(error)
    }
  }
}
