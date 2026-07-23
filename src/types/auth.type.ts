import type { Role } from '../models/user.model.js'

export interface JwtPayload {
  sub: string
  email: string
  role: Role
}

export interface AuthenticatedUser {
  id: string
  email: string
  role: Role
}

export interface LoginResult {
  token: string
  user: {
    id: string
    nome: string
    email: string
    role: Role
  }
}
