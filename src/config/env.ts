import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3333),
  HEALTH_CHECK_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
  HEALTH_CHECK_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  HEALTH_CHECK_SLOW_THRESHOLD_MS: z.coerce.number().int().positive().default(1_000),
  HEALTH_CHECK_CONCURRENCY: z.coerce.number().int().positive().default(20),
  
  RESOURCE_DOMAIN_HOMOLOGACAO: z.url().default('https://buncghml.funcao.digital'),
  RESOURCE_DOMAIN_PRODUCAO: z.url().default('https://credito.buni.digital'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Variáveis de ambiente inválidas:\n${z.prettifyError(parsed.error)}`)
}

export const env = {
  port: parsed.data.PORT,
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
}


