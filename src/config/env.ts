import { z } from 'zod'

function parseCsv(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  HEALTH_CHECK_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
  HEALTH_CHECK_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  HEALTH_CHECK_SLOW_THRESHOLD_MS: z.coerce.number().int().positive().default(1_000),
  HEALTH_CHECK_CONCURRENCY: z.coerce.number().int().positive().default(20),

  RESOURCE_DOMAIN_HOMOLOGACAO: z.url().default('https://buncghml.funcao.digital'),
  RESOURCE_DOMAIN_PRODUCAO: z.url().default('https://credito.buni.digital'),

  JWT_SECRET: z
    .string()
    .min(
      32,
      'JWT_SECRET é obrigatório e deve ter pelo menos 32 caracteres (use uma string aleatória forte).',
    ),
  JWT_EXPIRES_IN: z.string().default('8h'),

  CORS_ORIGIN: z.string().optional().default(''),

  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),

  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Variáveis de ambiente inválidas:\n${z.prettifyError(parsed.error)}`)
}

const corsOrigins = parseCsv(parsed.data.CORS_ORIGIN)

if (parsed.data.NODE_ENV === 'production' && corsOrigins.length === 0) {
  throw new Error(
    'CORS_ORIGIN é obrigatório em produção (lista separada por vírgula das origens autorizadas). ' +
      'Defina explicitamente para evitar liberar a API para qualquer origem.',
  )
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET === 'change-me') {
  throw new Error('JWT_SECRET não pode usar o valor de exemplo "change-me" em produção.')
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === 'production',
  port: parsed.data.PORT,
  logLevel: parsed.data.LOG_LEVEL,
  trustProxy: parsed.data.TRUST_PROXY,
  healthCheck: {
    intervalMs: parsed.data.HEALTH_CHECK_INTERVAL_MS,
    timeoutMs: parsed.data.HEALTH_CHECK_TIMEOUT_MS,
    slowThresholdMs: parsed.data.HEALTH_CHECK_SLOW_THRESHOLD_MS,
    concurrency: parsed.data.HEALTH_CHECK_CONCURRENCY,
  },
  resourceDomains: {
    homologacao: parsed.data.RESOURCE_DOMAIN_HOMOLOGACAO,
    producao: parsed.data.RESOURCE_DOMAIN_PRODUCAO,
  },
  jwt: {
    secret: parsed.data.JWT_SECRET,
    expiresIn: parsed.data.JWT_EXPIRES_IN,
  },
  cors: {
    origins: corsOrigins,
  },
  rateLimit: {
    windowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
    max: parsed.data.RATE_LIMIT_MAX,
    auth: {
      windowMs: parsed.data.AUTH_RATE_LIMIT_WINDOW_MS,
      max: parsed.data.AUTH_RATE_LIMIT_MAX,
    },
  },
}
