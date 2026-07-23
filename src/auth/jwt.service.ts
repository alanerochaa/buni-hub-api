import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import type { JwtPayload } from '../types/auth.type.js'

export class JwtService {
  sign(payload: JwtPayload): string {
    return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'] })
  }

  verify(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.jwt.secret) as JwtPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Sessão expirada. Faça login novamente.', 'TOKEN_EXPIRED')
      }
      throw ApiError.unauthorized('Token inválido.', 'TOKEN_INVALID')
    }
  }
}
