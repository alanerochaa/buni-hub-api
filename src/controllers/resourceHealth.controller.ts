import type { NextFunction, Request, Response } from 'express'
import type { HealthCheckService } from '../services/healthCheck.service.js'

export class ResourceHealthController {
  constructor(private readonly service: HealthCheckService) {}

  list = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(this.service.getAll())
    } catch (error) {
      next(error)
    }
  }

  getById = (req: Request<{ id: string }>, res: Response, next: NextFunction): void => {
    try {
      res.json(this.service.getById(req.params.id))
    } catch (error) {
      next(error)
    }
  }
}
