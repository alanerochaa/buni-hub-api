import type { NextFunction, Request, Response } from 'express'
import type { Role } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Autenticação necessária.', 'UNAUTHENTICATED'))
      return
    }

    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden('Você não tem permissão para acessar este recurso.', 'FORBIDDEN'))
      return
    }

    next()
  }
}
