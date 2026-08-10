import { Router } from 'express'
import { DashboardService } from '../services/dashboard.service.js'
import { DashboardController } from '../controllers/dashboard.controller.js'
import { resourceRepository } from './resource.routes.js'
import { healthCheckService } from './resourceHealth.routes.js'
import { historyService } from './history.routes.js'
import { authenticate } from '../middleware/authenticate.js'

const service = new DashboardService(resourceRepository, healthCheckService)
const controller = new DashboardController(service, historyService)

export const dashboardRoutes = Router()

// Públicas de propósito: o painel de TV (app `dashboard`) abre direto por URL, sem
// login, e consome só `/dashboard/overview` (chamada única e consolidada). `/dashboard`
// e `/dashboard/rankings` seguem públicas e no ar por compatibilidade — as demais
// rotas de dashboard abaixo continuam autenticadas por não serem usadas por esse painel.
dashboardRoutes.get('/dashboard', controller.getDashboard)
dashboardRoutes.get('/dashboard/rankings', controller.getRankings)
dashboardRoutes.get('/dashboard/overview', controller.getOverview)
dashboardRoutes.get('/dashboard/summary', authenticate, controller.getSummary)
dashboardRoutes.get('/dashboard/incidents', authenticate, controller.getIncidents)
