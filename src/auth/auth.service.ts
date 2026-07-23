import bcrypt from 'bcryptjs'
import type { UserRepository } from '../repositories/user.repository.js'
import type { JwtService } from './jwt.service.js'
import type { LoginInput } from '../validators/auth.schema.js'
import type { LoginResult } from '../types/auth.type.js'
import { ApiError } from '../utils/ApiError.js'

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
}
