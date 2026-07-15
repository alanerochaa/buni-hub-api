import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../utils/ApiError.js'

/**
 * Envelope de erro único { status, code, message } para toda a API —
 * `code` é estável (SCREAMING_SNAKE_CASE), independente da redação de
 * `message`. Assinatura de 4 parâmetros exigida pelo Express para
 * reconhecer isto como tratador de erros (req/next não usados aqui).
 */
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
