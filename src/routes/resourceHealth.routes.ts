import { Router } from 'express'
import { env } from '../config/env.js'
import { HealthRepository } from '../repositories/health.repository.js'
import { HealthCheckService } from '../services/healthCheck.service.js'
import { ResourceHealthController } from '../controllers/resourceHealth.controller.js'
import { resourceRepository } from './resource.routes.js'
import { authenticate } from '../middleware/authenticate.js'

const healthRepository = new HealthRepository()
export const healthCheckService = new HealthCheckService(
  resourceRepository,
  healthRepository,
  env.healthCheck,
)

const controller = new ResourceHealthController(healthCheckService)

export const resourceHealthRoutes = Router()

resourceHealthRoutes.get('/health/resources', authenticate, controller.list)
resourceHealthRoutes.get('/health/resources/:id', authenticate, controller.getById)
