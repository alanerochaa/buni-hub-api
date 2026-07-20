import { Router } from 'express'
import { JsonHistoryRepository } from '../repositories/history.repository.js'
import { JsonOperationalLogRepository } from '../repositories/operationalLog.repository.js'
import { OperationalLogService } from '../services/operationalLog.service.js'
import { HistoryService } from '../services/history.service.js'
import { HistoryController } from '../controllers/history.controller.js'

const historyRepository = new JsonHistoryRepository()
const operationalLogRepository = new JsonOperationalLogRepository()
const operationalLogService = new OperationalLogService(operationalLogRepository)


export const historyService = new HistoryService(historyRepository, operationalLogService)

const controller = new HistoryController(historyService)

export const historyRoutes = Router()

historyRoutes.get('/dashboard/history', controller.getHistory)
historyRoutes.get('/dashboard/events', controller.getOperationalLog)
