import { Router } from 'express'
import { JsonHistoryRepository } from '../repositories/history.repository.js'
import { JsonOperationalLogRepository } from '../repositories/operationalLog.repository.js'
import { OperationalLogService } from '../services/operationalLog.service.js'
import { HistoryService } from '../services/history.service.js'
import { HistoryController } from '../controllers/history.controller.js'

const historyRepository = new JsonHistoryRepository()
const operationalLogRepository = new JsonOperationalLogRepository()
const operationalLogService = new OperationalLogService(operationalLogRepository)

// Exportado para server.ts registrar o resultado de cada sweep — mesmo
// padrão de `resourceRepository`/`healthCheckService` em outras rotas.
// Um único service (`HistoryService`) orquestra os dois pilares do
// módulo de auditoria: Histórico Operacional (snapshots) e Log
// Operacional (eventos) — ver docblock de HistoryService.
export const historyService = new HistoryService(historyRepository, operationalLogService)

const controller = new HistoryController(historyService)

export const historyRoutes = Router()

// Histórico Operacional — métricas agregadas e série temporal.
historyRoutes.get('/dashboard/history', controller.getHistory)
// Log Operacional — eventos detalhados e auditoria. Nome da rota
// (`/dashboard/events`) e do arquivo de dados (`events.json`) mantidos
// por compatibilidade; o conceito exposto na documentação/interface é
// "Log Operacional".
historyRoutes.get('/dashboard/events', controller.getOperationalLog)
