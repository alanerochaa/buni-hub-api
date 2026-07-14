import { Router } from 'express'
import { resourceRoutes } from './resource.routes.js'
import { healthRoutes } from './health.routes.js'
import { resourceHealthRoutes } from './resourceHealth.routes.js'

export const routes = Router()

routes.use(healthRoutes)
routes.use(resourceHealthRoutes)
routes.use(resourceRoutes)
