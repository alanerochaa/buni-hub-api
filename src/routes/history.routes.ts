import { Router } from 'express'
import { JsonHistoryRepository } from '../repositories/history.repository.js'
import { JsonEventRepository } from '../repositories/event.repository.js'
import { EventService } from '../services/event.service.js'
import { HistoryService } from '../services/history.service.js'
import { HistoryController } from '../controllers/history.controller.js'

const historyRepository = new JsonHistoryRepository()
const eventRepository = new JsonEventRepository()
const eventService = new EventService(eventRepository)

// Exportado para server.ts registrar o resultado de cada sweep — mesmo
// padrão de `resourceRepository`/`healthCheckService` em outras rotas.
export const historyService = new HistoryService(historyRepository, eventService)

const controller = new HistoryController(historyService)

export const historyRoutes = Router()

historyRoutes.get('/dashboard/history', controller.getHistory)
historyRoutes.get('/dashboard/events', controller.getEvents)
