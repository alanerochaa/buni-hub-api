import type { NextFunction, Request, Response } from 'express'
import { JwtService } from '../auth/jwt.service.js'
import { ApiError } from '../utils/ApiError.js'

const jwtService = new JwtService()

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Autenticação necessária.', 'UNAUTHENTICATED'))
    return
  }

  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    next(ApiError.unauthorized('Autenticação necessária.', 'UNAUTHENTICATED'))
    return
  }

  const payload = jwtService.verify(token)
  req.user = { id: payload.sub, email: payload.email, role: payload.role }
  next()
}
