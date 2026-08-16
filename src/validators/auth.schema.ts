import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'E-mail é obrigatório.').email('E-mail inválido.'),
  password: z.string().min(1, 'Senha é obrigatória.'),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória.'),
    // 8+ caracteres, ao menos 1 letra e 1 número — mesma política de user.schema.ts.
    newPassword: z
      .string()
      .min(8, 'Nova senha deve ter pelo menos 8 caracteres.')
      .regex(/[a-zA-Z]/, 'Nova senha deve conter ao menos uma letra.')
      .regex(/[0-9]/, 'Nova senha deve conter ao menos um número.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas informadas não coincidem.',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
