import type { NextFunction, Request, Response } from 'express'
import type { DashboardService } from '../services/dashboard.service.js'
import type { HistoryService } from '../services/history.service.js'
import type { DashboardRankings } from '../types/dashboard.type.js'

const RANKING_LIMIT = 5
const UNSTABLE_WINDOW_MS = 24 * 60 * 60 * 1000

export class DashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly historyService: HistoryService,
  ) {}

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

  getRankings = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(this.buildRankings())
    } catch (error) {
      next(error)
    }
  }

  /**
   * Agrega summary + incidents + rankings numa única resposta para a tela principal
   * do painel (era 3 requisições separadas). Só orquestra — reutiliza exatamente os
   * mesmos métodos de serviço que `/dashboard` e `/dashboard/rankings` já chamam,
   * nenhum cálculo próprio.
   */
  getOverview = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json({
        summary: this.service.getSummary(),
        incidents: this.service.getIncidents(),
        rankings: this.buildRankings(),
      })
    } catch (error) {
      next(error)
    }
  }

  private buildRankings(): DashboardRankings {
    const sinceIso = new Date(Date.now() - UNSTABLE_WINDOW_MS).toISOString()
    return {
      slowest: this.service.getSlowestResources(RANKING_LIMIT),
      mostUnstable: this.historyService.getMostUnstable(sinceIso, RANKING_LIMIT),
    }
  }
}
