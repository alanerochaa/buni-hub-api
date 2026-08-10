import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './logger/logger.js'
import { resourceRepository } from './routes/resource.routes.js'
import { healthCheckService } from './routes/resourceHealth.routes.js'
import { historyService } from './routes/history.routes.js'

const app = createApp()

let sweepTimer: NodeJS.Timeout | undefined
let shuttingDown = false

async function runSweepAndRecordHistory(): Promise<void> {
  await healthCheckService.runSweep()

  const resources = resourceRepository.findAll()
  const healthByResourceId = new Map(
    healthCheckService.getAll().map((health) => [health.resourceId, health]),
  )
  historyService.recordSweepResult(resources, healthByResourceId)
}

function scheduleNextSweep(): void {
  if (shuttingDown) return

  sweepTimer = setTimeout(() => {
    runSweepAndRecordHistory()
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Falha no sweep periódico do health check')
      })
      .finally(scheduleNextSweep)
  }, env.healthCheck.intervalMs)
}

runSweepAndRecordHistory()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Falha no sweep inicial do health check')
  })
  .finally(scheduleNextSweep)

const server = app.listen(env.port, () => {
  logger.info({ port: env.port, nodeEnv: env.nodeEnv }, 'Portal de Serviços — API rodando')
})

server.headersTimeout = 65_000
server.requestTimeout = 60_000
server.keepAliveTimeout = 61_000

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return
  shuttingDown = true

  logger.info({ signal }, 'Sinal recebido, encerrando graciosamente')
  clearTimeout(sweepTimer)

  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'Erro ao encerrar o servidor HTTP')
      process.exit(1)
    }
    process.exit(0)
  })

  // Timeout de segurança caso alguma conexão fique presa e server.close() nunca resolva.
  setTimeout(() => {
    logger.error('Encerramento forçado: timeout de drenagem excedido')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandledRejection não tratado')
})

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'uncaughtException — encerrando processo')
  process.exit(1)
})
