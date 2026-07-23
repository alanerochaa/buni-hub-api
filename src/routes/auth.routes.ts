import { Router } from 'express'
import { JsonUserRepository } from '../repositories/jsonUser.repository.js'
import { JwtService } from '../auth/jwt.service.js'
import { AuthService } from '../auth/auth.service.js'
import { AuthController } from '../auth/auth.controller.js'
import { validateBody } from '../middleware/validateBody.js'
import { loginSchema } from '../validators/auth.schema.js'

const userRepository = new JsonUserRepository()
const jwtService = new JwtService()
const service = new AuthService(userRepository, jwtService)
const controller = new AuthController(service)

export const authRoutes = Router()

authRoutes.post('/auth/login', validateBody(loginSchema), controller.login)
