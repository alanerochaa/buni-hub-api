import { createApp } from './app.js'
import { env } from './config/env.js'
import { resourceRepository } from './routes/resource.routes.js'
import { healthCheckService } from './routes/resourceHealth.routes.js'
import { historyService } from './routes/history.routes.js'

const app = createApp()


async function runSweepAndRecordHistory(): Promise<void> {
  await healthCheckService.runSweep()

  const resources = resourceRepository.findAll()
  const healthByResourceId = new Map(healthCheckService.getAll().map((health) => [health.resourceId, health]))
  historyService.recordSweepResult(resources, healthByResourceId)
}

function scheduleNextSweep(): void {
  setTimeout(() => {
    runSweepAndRecordHistory()
      .catch((error: unknown) => {
        console.error('Falha no sweep periódico do health check:', error)
      })
      .finally(scheduleNextSweep)
  }, env.healthCheck.intervalMs)
}

runSweepAndRecordHistory()
  .catch((error: unknown) => {
    console.error('Falha no sweep inicial do health check:', error)
  })
  .finally(scheduleNextSweep)

app.listen(env.port, () => {
  console.log(`Portal de Serviços — API rodando em http://localhost:${env.port}`)
})
