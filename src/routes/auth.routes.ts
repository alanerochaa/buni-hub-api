import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { JsonUserRepository } from '../repositories/jsonUser.repository.js'
import { JwtService } from '../auth/jwt.service.js'
import { AuthService } from '../auth/auth.service.js'
import { AuthController } from '../auth/auth.controller.js'
import { validateBody } from '../middleware/validateBody.js'
import { loginSchema } from '../validators/auth.schema.js'
import { env } from '../config/env.js'

const userRepository = new JsonUserRepository()
const jwtService = new JwtService()
const service = new AuthService(userRepository, jwtService)
const controller = new AuthController(service)

export const authRoutes = Router()

// Limite mais restritivo que o global, específico para o endpoint de login,
// para dificultar ataques de força bruta de senha.
const loginRateLimit = rateLimit({
  windowMs: env.rateLimit.auth.windowMs,
  limit: env.rateLimit.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    status: 429,
    code: 'AUTH_RATE_LIMITED',
    message: 'Muitas tentativas de login. Tente novamente mais tarde.',
  },
})

authRoutes.post('/auth/login', loginRateLimit, validateBody(loginSchema), controller.login)
