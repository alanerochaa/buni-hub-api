import type { NextFunction, Request, Response } from 'express'
import type { ResourcePromotionService } from '../services/resourcePromotion.service.js'

export class ResourcePromotionController {
  constructor(private readonly service: ResourcePromotionService) {}

  promoteToProducao = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const report = this.service.promoteHomologacaoToProducao()
      res.status(report.success ? 200 : 422).json(report)
    } catch (error) {
      next(error)
    }
  }
}
