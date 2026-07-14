import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../utils/ApiError.js'

/** Assinatura de 4 parâmetros é exigida pelo Express para reconhecer
 * este middleware como tratador de erros (req/next não usados aqui). */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor.' })
}
