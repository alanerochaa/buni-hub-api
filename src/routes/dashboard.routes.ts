import { Router } from 'express'
import { DashboardService } from '../services/dashboard.service.js'
import { DashboardController } from '../controllers/dashboard.controller.js'
import { resourceRepository } from './resource.routes.js'
import { healthCheckService } from './resourceHealth.routes.js'
import { authenticate } from '../middleware/authenticate.js'

const service = new DashboardService(resourceRepository, healthCheckService)
const controller = new DashboardController(service)

export const dashboardRoutes = Router()

dashboardRoutes.get('/dashboard', controller.getDashboard)
dashboardRoutes.get('/dashboard/summary', authenticate, controller.getSummary)
dashboardRoutes.get('/dashboard/incidents', authenticate, controller.getIncidents)
