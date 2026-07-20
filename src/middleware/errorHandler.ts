import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../utils/ApiError.js'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      status: err.statusCode,
      code: err.code,
      message: err.message,
    })
    return
  }

  console.error(err)
  res.status(500).json({
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Ocorreu um erro interno. Tente novamente em alguns instantes.',
  })
}
