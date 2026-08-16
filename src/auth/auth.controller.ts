import type { NextFunction, Request, Response } from 'express'
import type { AuthService } from './auth.service.js'
import { ApiError } from '../utils/ApiError.js'

export class AuthController {
  constructor(private readonly service: AuthService) {}

  login = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = this.service.login(req.body)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  me = (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) throw ApiError.unauthorized('Autenticação necessária.', 'UNAUTHENTICATED')
      res.json(this.service.getProfile(req.user.id))
    } catch (error) {
      next(error)
    }
  }

  changePassword = (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) throw ApiError.unauthorized('Autenticação necessária.', 'UNAUTHENTICATED')
      this.service.changePassword(req.user.id, req.body)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
