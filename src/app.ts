import express, { type Express } from 'express'
import cors from 'cors'
import { routes } from './routes/index.js'
import { notFoundHandler } from './middleware/notFoundHandler.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp(): Express {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(routes)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
