import { createApp } from './app.js'
import { env } from './config/env.js'
import { healthCheckService } from './routes/resourceHealth.routes.js'

const app = createApp()

// Sweep inicial imediato (para /health/resources não ficar vazio logo
// após o boot) + varredura periódica em memória — sem fila/agendador
// externo, apenas um setInterval no próprio processo Node.
healthCheckService.runSweep().catch((error: unknown) => {
  console.error('Falha no sweep inicial do health check:', error)
})
setInterval(() => {
  healthCheckService.runSweep().catch((error: unknown) => {
    console.error('Falha no sweep periódico do health check:', error)
  })
}, env.healthCheck.intervalMs)

app.listen(env.port, () => {
  console.log(`Buni API Hub — API rodando em http://localhost:${env.port}`)
})
