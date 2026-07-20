import type { NextFunction, Request, Response } from 'express'
import type { ResourceService } from '../services/resource.service.js'
import type { ResourceEnvironment, ResourceType } from '../models/resource.model.js'

const RESOURCE_TYPES: ResourceType[] = ['api', 'web-service', 'site']
const RESOURCE_ENVIRONMENTS: ResourceEnvironment[] = [
  'homologacao',
  'producao',
  'desenvolvimento',
  'unknown',
]

function parseType(value: unknown): ResourceType | undefined {
  return RESOURCE_TYPES.includes(value as ResourceType) ? (value as ResourceType) : undefined
}

function parseEnvironment(value: unknown): ResourceEnvironment | undefined {
  return RESOURCE_ENVIRONMENTS.includes(value as ResourceEnvironment)
    ? (value as ResourceEnvironment)
    : undefined
}

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

  create = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const resource = this.service.createResource(req.body)
      res.status(201).json(resource)
    } catch (error) {
      next(error)
    }
  }

  update = (req: Request<{ id: string }>, res: Response, next: NextFunction): void => {
    try {
      const resource = this.service.updateResource(req.params.id, req.body)
      res.json(resource)
    } catch (error) {
      next(error)
    }
  }

  remove = (req: Request<{ id: string }>, res: Response, next: NextFunction): void => {
    try {
      this.service.deleteResource(req.params.id)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
