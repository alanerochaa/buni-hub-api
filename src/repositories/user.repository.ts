import type { User } from '../models/user.model.js'

export interface UserRepository {
  findAll(): User[]
  findByEmail(email: string): User | undefined
  findById(id: string): User | undefined
  countActiveAdmins(excludeId?: string): number
  create(user: User): User
  update(id: string, patch: Partial<User>): User | undefined
}
