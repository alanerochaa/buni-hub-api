import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Request, Response } from 'express'
import { resourceRepository } from '../routes/resource.routes.js'

const packageJsonPath = path.join(import.meta.dirname, '../../package.json')
const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version: string }

// Liveness: só responde se o processo está de pé. Não deve checar dependências —
// é o que o HEALTHCHECK do Docker e o orquestrador usam para decidir se reinicia o container.
export function getHealth(_req: Request, res: Response): void {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    version,
  })
}

// Readiness: verifica se a aplicação já tem o que precisa para atender tráfego
// de verdade (arquivo de recursos carregado com sucesso). Usada por load balancers/
// orquestradores para decidir se uma réplica entra no pool antes de receber requisições.
export function getReadiness(_req: Request, res: Response): void {
  try {
    resourceRepository.findAll()
    res.json({ status: 'READY', timestamp: new Date().toISOString() })
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      reason: error instanceof Error ? error.message : 'Falha ao carregar dados de recursos.',
    })
  }
}
