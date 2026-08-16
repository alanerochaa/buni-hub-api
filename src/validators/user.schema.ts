import { z } from 'zod'

const ROLES = ['ROLE_ADMIN', 'ROLE_USER'] as const

// 8+ caracteres, ao menos 1 letra e 1 número.
const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres.')
  .regex(/[a-zA-Z]/, 'Senha deve conter ao menos uma letra.')
  .regex(/[0-9]/, 'Senha deve conter ao menos um número.')

export const createUserSchema = z
  .object({
    nome: z.string().trim().min(1, 'Nome é obrigatório.'),
    email: z.string().trim().min(1, 'E-mail é obrigatório.').email('E-mail inválido.'),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(ROLES, { error: 'Perfil é obrigatório.' }),
    ativo: z.boolean().default(true),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas informadas não coincidem.',
    path: ['confirmPassword'],
  })

export const updateUserSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório.').optional(),
  email: z.string().trim().min(1, 'E-mail é obrigatório.').email('E-mail inválido.').optional(),
  role: z.enum(ROLES).optional(),
  ativo: z.boolean().optional(),
})

export const updateUserStatusSchema = z.object({
  ativo: z.boolean(),
})

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas informadas não coincidem.',
    path: ['confirmPassword'],
  })

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
