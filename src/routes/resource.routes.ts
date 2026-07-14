import { Router } from 'express'
import { ResourceRepository } from '../repositories/resource.repository.js'
import { ResourceService } from '../services/resource.service.js'
import { ResourceController } from '../controllers/resource.controller.js'

const repository = new ResourceRepository()
const service = new ResourceService(repository)
const controller = new ResourceController(service)

export const resourceRoutes = Router()

resourceRoutes.get('/resources', controller.list)
resourceRoutes.get('/resources/:id', controller.getById)
resourceRoutes.get('/summary', controller.getSummary)
