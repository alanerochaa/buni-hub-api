import type { Request, Response } from 'express'

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  })
}
