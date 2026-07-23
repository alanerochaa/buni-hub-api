export type Role = 'ROLE_ADMIN' | 'ROLE_USER'

export interface User {
  id: string
  nome: string
  email: string
  passwordHash: string
  role: Role
  ativo: boolean
}

export type PublicUser = Omit<User, 'passwordHash'>
