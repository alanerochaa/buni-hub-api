import { z } from 'zod'

const RESOURCE_TYPES = ['api', 'web-service', 'site'] as const
const RESOURCE_ENVIRONMENTS = ['homologacao', 'producao', 'desenvolvimento', 'unknown'] as const

export const createResourceSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.'),
  type: z.enum(RESOURCE_TYPES, { error: 'Tipo é obrigatório.' }),
  url: z.string().trim().min(1, 'URL é obrigatória.').url('URL inválida.'),
  environment: z.enum(RESOURCE_ENVIRONMENTS, { error: 'Ambiente é obrigatório.' }),
  active: z.boolean().default(true),
  description: z.string().trim().optional(),
  docUrl: z.string().trim().url('URL da documentação inválida.').optional().or(z.literal('')),
  responsible: z.string().trim().optional(),
  area: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  category: z.string().trim().optional(),
  code: z.string().trim().optional(),
  keywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

export const updateResourceSchema = createResourceSchema.partial()

export type CreateResourceInput = z.infer<typeof createResourceSchema>
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>
