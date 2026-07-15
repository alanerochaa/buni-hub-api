import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'
import { ApiError } from '../utils/ApiError.js'

/**
 * Middleware genérico de validação de body via zod: em caso de erro,
 * traduz para ApiError.badRequest (400, code VALIDATION_ERROR), tratado
 * por errorHandler.ts no envelope único { status, code, message }.
 */
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(' ')
      next(ApiError.badRequest(message || 'Dados inválidos.', 'VALIDATION_ERROR'))
      return
    }
    req.body = result.data
    next()
  }
}
