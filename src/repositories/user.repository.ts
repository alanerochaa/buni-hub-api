import type { User } from '../models/user.model.js'

export interface UserRepository {
  findByEmail(email: string): User | undefined
  findById(id: string): User | undefined
}
