import { createApp } from './app.js'
import { env } from './config/env.js'
import { healthCheckService } from './routes/resourceHealth.routes.js'

const app = createApp()

healthCheckService.runSweep().catch((error: unknown) => {
  console.error('Falha no sweep inicial do health check:', error)
})
setInterval(() => {
  healthCheckService.runSweep().catch((error: unknown) => {
    console.error('Falha no sweep periódico do health check:', error)
  })
}, env.healthCheck.intervalMs)

app.listen(env.port, () => {
  console.log(`Portal de Serviços — API rodando em http://localhost:${env.port}`)
})
