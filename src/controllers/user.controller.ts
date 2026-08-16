import type { NextFunction, Request, Response } from 'express'
import type { UserService } from '../services/user.service.js'
import { ApiError } from '../utils/ApiError.js'

export class UserController {
  constructor(private readonly service: UserService) {}

  list = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(this.service.listUsers())
    } catch (error) {
      next(error)
    }
  }

  getById = (req: Request<{ id: string }>, res: Response, next: NextFunction): void => {
    try {
      res.json(this.service.getUserById(req.params.id))
    } catch (error) {
      next(error)
    }
  }

  create = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = this.service.createUser(req.body)
      res.status(201).json(user)
    } catch (error) {
      next(error)
    }
  }

  update = (req: Request<{ id: string }>, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) throw ApiError.unauthorized('Autenticação necessária.', 'UNAUTHENTICATED')
      const user = this.service.updateUser(req.params.id, req.body, req.user.id)
      res.json(user)
    } catch (error) {
      next(error)
    }
  }

  updateStatus = (req: Request<{ id: string }>, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) throw ApiError.unauthorized('Autenticação necessária.', 'UNAUTHENTICATED')
      const user = this.service.updateUserStatus(req.params.id, req.body, req.user.id)
      res.json(user)
    } catch (error) {
      next(error)
    }
  }

  resetPassword = (req: Request<{ id: string }>, res: Response, next: NextFunction): void => {
    try {
      const user = this.service.resetPassword(req.params.id, req.body)
      res.json(user)
    } catch (error) {
      next(error)
    }
  }
}
