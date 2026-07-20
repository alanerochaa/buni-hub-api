import { Router } from 'express'
import { resourceRoutes } from './resource.routes.js'
import { healthRoutes } from './health.routes.js'
import { resourceHealthRoutes } from './resourceHealth.routes.js'
import { dashboardRoutes } from './dashboard.routes.js'
import { historyRoutes } from './history.routes.js'
import { resourcePromotionRoutes } from './resourcePromotion.routes.js'

export const routes = Router()

routes.get('/', (_req, res) => {
  res.json({
    name: 'Buni API Hub',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

routes.use(healthRoutes)
routes.use(resourceHealthRoutes)
routes.use(dashboardRoutes)
routes.use(historyRoutes)
routes.use(resourcePromotionRoutes)
routes.use(resourceRoutes)