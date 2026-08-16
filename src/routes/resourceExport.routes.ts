import { Router } from 'express'
import { ResourceService } from '../services/resource.service.js'
import { ResourceExportService } from '../services/resourceExport.service.js'
import { ResourceExportController } from '../controllers/resourceExport.controller.js'
import { resourceRepository, resourceUsageRepository } from './resource.routes.js'
import { authenticate } from '../middleware/authenticate.js'

const resourceService = new ResourceService(resourceRepository, resourceUsageRepository)
const exportService = new ResourceExportService(resourceService)
const controller = new ResourceExportController(exportService)

export const resourceExportRoutes = Router()

// Precisa ser registrada (em routes/index.ts) antes de `resourceRoutes`, que define
// `GET /resources/:id` — senão o Express casaria `/resources/export` com esse `:id`.
resourceExportRoutes.get('/resources/export', authenticate, controller.export)
