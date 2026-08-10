import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../utils/ApiError.js'
import { logger } from '../logger/logger.js'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = res.getHeader('X-Request-Id')

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId, path: req.path }, 'Erro de aplicação (5xx)')
    }
    res.status(err.statusCode).json({
      status: err.statusCode,
      code: err.code,
      message: err.message,
      requestId,
    })
    return
  }

  logger.error({ err, requestId, path: req.path }, 'Erro não tratado')
  res.status(500).json({
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Ocorreu um erro interno. Tente novamente em alguns instantes.',
    requestId,
  })
}
