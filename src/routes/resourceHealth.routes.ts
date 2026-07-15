import { Router } from 'express'
import { env } from '../config/env.js'
import { HealthRepository } from '../repositories/health.repository.js'
import { HealthCheckService } from '../services/healthCheck.service.js'
import { ResourceHealthController } from '../controllers/resourceHealth.controller.js'
import { resourceRepository } from './resource.routes.js'

const healthRepository = new HealthRepository()

// Exportado para server.ts poder disparar o sweep inicial e agendar as
// varreduras periódicas — é a mesma instância lida pelas rotas abaixo.
export const healthCheckService = new HealthCheckService(
  resourceRepository,
  healthRepository,
  env.healthCheck,
)

const controller = new ResourceHealthController(healthCheckService)

export const resourceHealthRoutes = Router()

resourceHealthRoutes.get('/health/resources', controller.list)
resourceHealthRoutes.get('/health/resources/:id', controller.getById)
