import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { User } from '../models/user.model.js'
import type { UserRepository } from './user.repository.js'

export class JsonUserRepository implements UserRepository {
  private cache: User[] | null = null

  constructor(
    private readonly dataFilePath: string = path.join(
      import.meta.dirname,
      '../data/users.json',
    ),
  ) {}

  private load(): User[] {
    if (this.cache === null) {
      const raw = readFileSync(this.dataFilePath, 'utf-8')
      this.cache = JSON.parse(raw) as User[]
    }
    return this.cache
  }

  findByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase()
    return this.load().find((user) => user.email.toLowerCase() === normalized)
  }

  findById(id: string): User | undefined {
    return this.load().find((user) => user.id === id)
  }
}
