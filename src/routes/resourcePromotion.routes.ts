import { Router } from 'express'
import { ResourceService } from '../services/resource.service.js'
import { ResourcePromotionService } from '../services/resourcePromotion.service.js'
import { ResourcePromotionController } from '../controllers/resourcePromotion.controller.js'
import { resourceRepository } from './resource.routes.js'

const resourceService = new ResourceService(resourceRepository)
const promotionService = new ResourcePromotionService(resourceRepository, resourceService)
const controller = new ResourcePromotionController(promotionService)

export const resourcePromotionRoutes = Router()
resourcePromotionRoutes.post(
  '/admin/resources/promote-to-producao',
  controller.promoteToProducao,
)
