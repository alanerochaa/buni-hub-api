import { Router } from 'express'
import { JsonUserRepository } from '../repositories/jsonUser.repository.js'
import { UserService } from '../services/user.service.js'
import { UserController } from '../controllers/user.controller.js'
import { validateBody } from '../middleware/validateBody.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from '../validators/user.schema.js'

export const userRepository = new JsonUserRepository()
const service = new UserService(userRepository)
const controller = new UserController(service)

export const userRoutes = Router()

const requireAdmin = [authenticate, authorize('ROLE_ADMIN')]

userRoutes.get('/users', requireAdmin, controller.list)
userRoutes.get('/users/:id', requireAdmin, controller.getById)
userRoutes.post('/users', requireAdmin, validateBody(createUserSchema), controller.create)
userRoutes.put('/users/:id', requireAdmin, validateBody(updateUserSchema), controller.update)
userRoutes.patch(
  '/users/:id/status',
  requireAdmin,
  validateBody(updateUserStatusSchema),
  controller.updateStatus,
)
userRoutes.post(
  '/users/:id/reset-password',
  requireAdmin,
  validateBody(resetPasswordSchema),
  controller.resetPassword,
)
