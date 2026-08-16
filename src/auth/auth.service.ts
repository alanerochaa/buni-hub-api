import bcrypt from 'bcryptjs'
import type { UserRepository } from '../repositories/user.repository.js'
import type { JwtService } from './jwt.service.js'
import type { ChangePasswordInput, LoginInput } from '../validators/auth.schema.js'
import type { LoginResult } from '../types/auth.type.js'
import type { PublicUser } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'

const PASSWORD_HASH_ROUNDS = 10

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  login(input: LoginInput): LoginResult {
    const user = this.userRepository.findByEmail(input.email)
    if (!user || !user.ativo) {
      throw ApiError.unauthorized('E-mail ou senha inválidos.', 'INVALID_CREDENTIALS')
    }

    const passwordMatches = bcrypt.compareSync(input.password, user.passwordHash)
    if (!passwordMatches) {
      throw ApiError.unauthorized('E-mail ou senha inválidos.', 'INVALID_CREDENTIALS')
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role })

    this.userRepository.update(user.id, { lastLoginAt: new Date().toISOString() })

    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
      },
    }
  }

  getProfile(userId: string): PublicUser {
    const user = this.userRepository.findById(userId)
    if (!user) {
      throw ApiError.notFound('Usuário não encontrado.', 'USER_NOT_FOUND')
    }
    const { id, nome, email, role, ativo, createdAt, updatedAt, lastLoginAt } = user
    return { id, nome, email, role, ativo, createdAt, updatedAt, lastLoginAt }
  }

  changePassword(userId: string, input: ChangePasswordInput): void {
    const user = this.userRepository.findById(userId)
    if (!user) {
      throw ApiError.notFound('Usuário não encontrado.', 'USER_NOT_FOUND')
    }

    if (!bcrypt.compareSync(input.currentPassword, user.passwordHash)) {
      // Não usar 401 aqui: o interceptor global do axios no frontend trata QUALQUER
      // 401 como sessão inválida/expirada e força logout — mas a sessão continua
      // válida, só a senha atual informada está errada. 422 é o mesmo código já
      // usado para outras violações de regra de negócio (ex.: LAST_ACTIVE_ADMIN).
      throw ApiError.unprocessable('Senha atual incorreta.', 'INVALID_CURRENT_PASSWORD')
    }

    this.userRepository.update(userId, {
      passwordHash: bcrypt.hashSync(input.newPassword, PASSWORD_HASH_ROUNDS),
      updatedAt: new Date().toISOString(),
    })
  }
}
