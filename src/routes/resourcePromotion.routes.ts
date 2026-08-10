import { Router } from 'express'
import { ResourceService } from '../services/resource.service.js'
import { ResourcePromotionService } from '../services/resourcePromotion.service.js'
import { ResourcePromotionController } from '../controllers/resourcePromotion.controller.js'
import { resourceRepository, resourceUsageRepository } from './resource.routes.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'

const resourceService = new ResourceService(resourceRepository, resourceUsageRepository)
const promotionService = new ResourcePromotionService(resourceRepository, resourceService)
const controller = new ResourcePromotionController(promotionService)

export const resourcePromotionRoutes = Router()
resourcePromotionRoutes.post(
  '/admin/resources/promote-to-producao',
  authenticate,
  authorize('ROLE_ADMIN'),
  controller.promoteToProducao,
)
