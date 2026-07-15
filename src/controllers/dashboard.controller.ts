import type { NextFunction, Request, Response } from 'express'
import type { DashboardService } from '../services/dashboard.service.js'

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  getDashboard = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json({
        summary: this.service.getSummary(),
        incidents: this.service.getIncidents(),
      })
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

  getIncidents = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(this.service.getIncidents())
    } catch (error) {
      next(error)
    }
  }
}
