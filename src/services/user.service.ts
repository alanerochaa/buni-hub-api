import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { UserRepository } from '../repositories/user.repository.js'
import type { PublicUser, User } from '../models/user.model.js'
import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from '../validators/user.schema.js'
import { ApiError } from '../utils/ApiError.js'

const PASSWORD_HASH_ROUNDS = 10

function toPublicUser(user: User): PublicUser {
  const { id, nome, email, role, ativo, createdAt, updatedAt, lastLoginAt } = user
  return { id, nome, email, role, ativo, createdAt, updatedAt, lastLoginAt }
}

export class UserService {
  constructor(private readonly repository: UserRepository) {}

  listUsers(): PublicUser[] {
    return [...this.repository.findAll()]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map(toPublicUser)
  }

  getUserById(id: string): PublicUser {
    const user = this.repository.findById(id)
    if (!user) {
      throw ApiError.notFound(`Usuário não encontrado: ${id}`, 'USER_NOT_FOUND')
    }
    return toPublicUser(user)
  }

  createUser(input: CreateUserInput): PublicUser {
    this.assertEmailNotDuplicate(input.email)

    const now = new Date().toISOString()
    const user: User = {
      id: `user-${randomUUID()}`,
      nome: input.nome,
      email: input.email.trim().toLowerCase(),
      passwordHash: bcrypt.hashSync(input.password, PASSWORD_HASH_ROUNDS),
      role: input.role,
      ativo: input.ativo,
      createdAt: now,
      updatedAt: now,
    }

    return toPublicUser(this.repository.create(user))
  }

  updateUser(id: string, input: UpdateUserInput, actingUserId: string): PublicUser {
    const existing = this.getExistingUser(id)

    if (input.email !== undefined) {
      this.assertEmailNotDuplicate(input.email, id)
    }

    // Evita que um admin altere o próprio perfil (elevação ou rebaixamento indevido)
    // por engano ou má-fé através da própria sessão autenticada.
    if (input.role !== undefined && input.role !== existing.role && actingUserId === id) {
      throw ApiError.forbidden('Você não pode alterar o próprio perfil.', 'CANNOT_CHANGE_OWN_ROLE')
    }

    const roleChangingAwayFromAdmin = input.role !== undefined && input.role !== 'ROLE_ADMIN'
    const beingDeactivated = input.ativo === false
    if (
      existing.role === 'ROLE_ADMIN' &&
      existing.ativo &&
      (roleChangingAwayFromAdmin || beingDeactivated)
    ) {
      this.assertNotLastActiveAdmin(id)
    }

    const patch: Partial<User> = {
      ...input,
      // Não usar `undefined` no fallback: o objeto final é mesclado por spread
      // (`{...existing, ...patch}`) no repositório — uma chave presente com valor
      // `undefined` sobrescreveria o e-mail já salvo em vez de preservá-lo.
      email: input.email ? input.email.trim().toLowerCase() : existing.email,
      updatedAt: new Date().toISOString(),
    }

    const updated = this.repository.update(id, patch)
    if (!updated) {
      throw ApiError.notFound(`Usuário não encontrado: ${id}`, 'USER_NOT_FOUND')
    }
    return toPublicUser(updated)
  }

  updateUserStatus(id: string, input: UpdateUserStatusInput, actingUserId: string): PublicUser {
    return this.updateUser(id, { ativo: input.ativo }, actingUserId)
  }

  resetPassword(id: string, input: ResetPasswordInput): PublicUser {
    this.getExistingUser(id)

    const updated = this.repository.update(id, {
      passwordHash: bcrypt.hashSync(input.newPassword, PASSWORD_HASH_ROUNDS),
      updatedAt: new Date().toISOString(),
    })
    if (!updated) {
      throw ApiError.notFound(`Usuário não encontrado: ${id}`, 'USER_NOT_FOUND')
    }
    return toPublicUser(updated)
  }

  private getExistingUser(id: string): User {
    const user = this.repository.findById(id)
    if (!user) {
      throw ApiError.notFound(`Usuário não encontrado: ${id}`, 'USER_NOT_FOUND')
    }
    return user
  }

  private assertEmailNotDuplicate(email: string, excludeId?: string): void {
    const existing = this.repository.findByEmail(email)
    if (existing && existing.id !== excludeId) {
      throw ApiError.conflict(
        'Já existe um usuário cadastrado com este e-mail.',
        'USER_DUPLICATE_EMAIL',
      )
    }
  }

  private assertNotLastActiveAdmin(excludeId: string): void {
    if (this.repository.countActiveAdmins(excludeId) === 0) {
      throw ApiError.unprocessable(
        'Não é possível remover o último administrador ativo do sistema.',
        'LAST_ACTIVE_ADMIN',
      )
    }
  }
}
