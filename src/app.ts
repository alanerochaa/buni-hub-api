import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import { routes } from './routes/index.js'
import { notFoundHandler } from './middleware/notFoundHandler.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'

const corsOptions: cors.CorsOptions = {
  // Fora de produção, sem CORS_ORIGIN configurado, libera qualquer origem (conveniência
  // de desenvolvimento local). Em produção o boot falha em config/env.ts se estiver vazio.
  origin: env.cors.origins.length > 0 ? env.cors.origins : true,
}

const globalRateLimit = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    code: 'RATE_LIMITED',
    message: 'Muitas requisições. Tente novamente mais tarde.',
  },
})

export function createApp(): Express {
  const app = express()

  app.set('trust proxy', env.trustProxy)
  app.disable('x-powered-by')

  app.use(helmet())
  app.use(cors(corsOptions))
  app.use(compression())
  app.use(requestLogger)
  app.use(express.json({ limit: '1mb' }))
  app.use(globalRateLimit)

  app.use(routes)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
