import { Router } from 'express'
import { ResourceRepository } from '../repositories/resource.repository.js'
import { JsonResourceUsageRepository } from '../repositories/resourceUsage.repository.js'
import { ResourceService } from '../services/resource.service.js'
import { ResourceController } from '../controllers/resource.controller.js'
import { validateBody } from '../middleware/validateBody.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { createResourceSchema, updateResourceSchema } from '../validators/resource.schema.js'

export const resourceRepository = new ResourceRepository()
export const resourceUsageRepository = new JsonResourceUsageRepository()
const service = new ResourceService(resourceRepository, resourceUsageRepository)
const controller = new ResourceController(service)

export const resourceRoutes = Router()

const requireAdmin = [authenticate, authorize('ROLE_ADMIN')]

resourceRoutes.get('/resources', authenticate, controller.list)
resourceRoutes.get('/resources/:id', authenticate, controller.getById)
resourceRoutes.get('/summary', authenticate, controller.getSummary)
resourceRoutes.post(
  '/resources',
  requireAdmin,
  validateBody(createResourceSchema),
  controller.create,
)
resourceRoutes.put(
  '/resources/:id',
  requireAdmin,
  validateBody(updateResourceSchema),
  controller.update,
)
resourceRoutes.delete('/resources/:id', requireAdmin, controller.remove)

// Sem consumidor real hoje — ver `resourceUsage.model.ts`. Autenticada (não faz parte
// do painel público) para já existir pronta quando uma integração de consumo real
// (gateway/proxy) for definida.
resourceRoutes.post('/resources/:id/usage', authenticate, controller.recordUsage)
