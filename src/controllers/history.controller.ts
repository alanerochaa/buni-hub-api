import type { NextFunction, Request, Response } from 'express'
import type { HistoryService } from '../services/history.service.js'

export class HistoryController {
  constructor(private readonly service: HistoryService) {}

  getHistory = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(this.service.getHistory())
    } catch (error) {
      next(error)
    }
  }

  getEvents = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(this.service.getEvents())
    } catch (error) {
      next(error)
    }
  }
}
