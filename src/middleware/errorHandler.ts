import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../utils/ApiError.js'

/**
 * Envelope de erro único para toda a API — { status, code, message } —
 * consumido pelo Frontend (lib/apiErrorMessage.ts) para nunca expor
 * texto técnico ao usuário final. `code` é uma string estável
 * (SCREAMING_SNAKE_CASE) que identifica o motivo, independente da
 * redação de `message` (que pode mudar sem quebrar quem lê `code`).
 *
 * Assinatura de 4 parâmetros é exigida pelo Express para reconhecer
 * este middleware como tratador de erros (req/next não usados aqui).
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
