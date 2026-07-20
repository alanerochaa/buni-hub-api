import { Router } from 'express'
import { ResourceRepository } from '../repositories/resource.repository.js'
import { ResourceService } from '../services/resource.service.js'
import { ResourceController } from '../controllers/resource.controller.js'
import { validateBody } from '../middleware/validateBody.js'
import { createResourceSchema, updateResourceSchema } from '../validators/resource.schema.js'

export const resourceRepository = new ResourceRepository()
const service = new ResourceService(resourceRepository)
const controller = new ResourceController(service)

export const resourceRoutes = Router()

resourceRoutes.get('/resources', controller.list)
resourceRoutes.get('/resources/:id', controller.getById)
resourceRoutes.get('/summary', controller.getSummary)
resourceRoutes.post('/resources', validateBody(createResourceSchema), controller.create)
resourceRoutes.put('/resources/:id', validateBody(updateResourceSchema), controller.update)
resourceRoutes.delete('/resources/:id', controller.remove)
