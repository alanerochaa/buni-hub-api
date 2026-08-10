import pino from 'pino'
import { env } from '../config/env.js'

export const logger = pino({
  level: env.logLevel,
  base: { service: 'buni-api-hub-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: env.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
})
