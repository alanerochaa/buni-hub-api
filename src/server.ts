import { createApp } from './app.js'
import { env } from './config/env.js'
import { resourceRepository } from './routes/resource.routes.js'
import { healthCheckService } from './routes/resourceHealth.routes.js'
import { historyService } from './routes/history.routes.js'

const app = createApp()

// Estende o resultado do sweep (não altera HealthCheckService.runSweep):
// depois que a varredura termina, registra o snapshot agregado e as
// transições de status do ciclo no Histórico Operacional.
async function runSweepAndRecordHistory(): Promise<void> {
  await healthCheckService.runSweep()

  const resources = resourceRepository.findAll()
  const healthByResourceId = new Map(healthCheckService.getAll().map((health) => [health.resourceId, health]))
  historyService.recordSweepResult(resources, healthByResourceId)
}

runSweepAndRecordHistory().catch((error: unknown) => {
  console.error('Falha no sweep inicial do health check:', error)
})
setInterval(() => {
  runSweepAndRecordHistory().catch((error: unknown) => {
    console.error('Falha no sweep periódico do health check:', error)
  })
}, env.healthCheck.intervalMs)

app.listen(env.port, () => {
  console.log(`Portal de Serviços — API rodando em http://localhost:${env.port}`)
})
