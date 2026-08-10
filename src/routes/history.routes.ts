import { Router } from 'express'
import { JsonHistoryRepository } from '../repositories/history.repository.js'
import { JsonOperationalLogRepository } from '../repositories/operationalLog.repository.js'
import { OperationalLogService } from '../services/operationalLog.service.js'
import { HistoryService } from '../services/history.service.js'
import { HistoryController } from '../controllers/history.controller.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { resourceRepository } from './resource.routes.js'

const historyRepository = new JsonHistoryRepository()
const operationalLogRepository = new JsonOperationalLogRepository()
const operationalLogService = new OperationalLogService(operationalLogRepository)

export const historyService = new HistoryService(
  historyRepository,
  operationalLogService,
  resourceRepository,
)

const controller = new HistoryController(historyService)

export const historyRoutes = Router()

// Pública de propósito: consumida pelo painel de TV (app `dashboard`), que abre
// direto por URL sem login. Somente leitura (histórico agregado de disponibilidade).
historyRoutes.get('/dashboard/history', controller.getHistory)

// Continua autenticada — é o Log Operacional do portal administrativo (web), não o
// painel de TV.
historyRoutes.get(
  '/dashboard/events',
  authenticate,
  authorize('ROLE_ADMIN'),
  controller.getOperationalLog,
)
