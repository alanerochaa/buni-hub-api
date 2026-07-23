import type { NextFunction, Request, Response } from 'express'
import type { AuthService } from './auth.service.js'

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
}
