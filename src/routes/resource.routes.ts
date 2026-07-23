import { Router } from 'express'
import { ResourceRepository } from '../repositories/resource.repository.js'
import { ResourceService } from '../services/resource.service.js'
import { ResourceController } from '../controllers/resource.controller.js'
import { validateBody } from '../middleware/validateBody.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { createResourceSchema, updateResourceSchema } from '../validators/resource.schema.js'

export const resourceRepository = new ResourceRepository()
const service = new ResourceService(resourceRepository)
const controller = new ResourceController(service)

export const resourceRoutes = Router()

const requireAdmin = [authenticate, authorize('ROLE_ADMIN')]

resourceRoutes.get('/resources', authenticate, controller.list)
resourceRoutes.get('/resources/:id', authenticate, controller.getById)
resourceRoutes.get('/summary', authenticate, controller.getSummary)
resourceRoutes.post('/resources', requireAdmin, validateBody(createResourceSchema), controller.create)
resourceRoutes.put('/resources/:id', requireAdmin, validateBody(updateResourceSchema), controller.update)
resourceRoutes.delete('/resources/:id', requireAdmin, controller.remove)
