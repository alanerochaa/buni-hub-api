import type { NextFunction, Request, Response } from 'express'
import type { ResourceService } from '../services/resource.service.js'
import type { ResourceEnvironment, ResourceType } from '../models/resource.model.js'

const RESOURCE_TYPES: ResourceType[] = ['api', 'web-service', 'site']
const RESOURCE_ENVIRONMENTS: ResourceEnvironment[] = ['homologacao', 'producao', 'unknown']

function parseType(value: unknown): ResourceType | undefined {
  return RESOURCE_TYPES.includes(value as ResourceType) ? (value as ResourceType) : undefined
}

function parseEnvironment(value: unknown): ResourceEnvironment | undefined {
  return RESOURCE_ENVIRONMENTS.includes(value as ResourceEnvironment)
    ? (value as ResourceEnvironment)
    : undefined
}

/**
 * Apenas traduz HTTP <-> domínio: lê query/params da requisição, chama
 * o service e devolve a resposta. Nenhuma regra de negócio aqui.
 */
export class ResourceController {
  constructor(private readonly service: ResourceService) {}

  list = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const resources = this.service.listResources({
        type: parseType(req.query.type),
        environment: parseEnvironment(req.query.environment),
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      })
      res.json(resources)
    } catch (error) {
      next(error)
    }
  }

  getById = (req: Request<{ id: string }>, res: Response, next: NextFunction): void => {
    try {
      const resource = this.service.getResourceById(req.params.id)
      res.json(resource)
    } catch (error) {
      next(error)
    }
  }

  getSummary = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(this.service.getSummary())
    } catch (error) {
      next(error)
    }
  }
}
