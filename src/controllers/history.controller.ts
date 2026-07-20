import type { NextFunction, Request, Response } from 'express'
import type { HistoryService } from '../services/history.service.js'
import type { ResourceEnvironment } from '../models/resource.model.js'
import type { DashboardResourceStatus } from '../types/dashboard.type.js'

const OPERATIONAL_LOG_STATUSES: DashboardResourceStatus[] = ['online', 'offline', 'maintenance', 'unknown']
const RESOURCE_ENVIRONMENTS: ResourceEnvironment[] = [
  'homologacao',
  'producao',
  'desenvolvimento',
  'unknown',
]

function parseStatus(value: unknown): DashboardResourceStatus | undefined {
  return OPERATIONAL_LOG_STATUSES.includes(value as DashboardResourceStatus)
    ? (value as DashboardResourceStatus)
    : undefined
}

function parseEnvironment(value: unknown): ResourceEnvironment | undefined {
  return RESOURCE_ENVIRONMENTS.includes(value as ResourceEnvironment)
    ? (value as ResourceEnvironment)
    : undefined
}

function parseIsoDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return undefined
  return value
}

export class HistoryController {
  constructor(private readonly service: HistoryService) {}

  getHistory = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(this.service.getHistory())
    } catch (error) {
      next(error)
    }
  }

  getOperationalLog = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const events = this.service.getOperationalLog({
        resourceId: typeof req.query.resourceId === 'string' ? req.query.resourceId : undefined,
        status: parseStatus(req.query.status),
        environment: parseEnvironment(req.query.environment),
        since: parseIsoDate(req.query.since),
        until: parseIsoDate(req.query.until),
      })
      res.json(events)
    } catch (error) {
      next(error)
    }
  }
}
