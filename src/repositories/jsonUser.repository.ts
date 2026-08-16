import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { User } from '../models/user.model.js'
import type { UserRepository } from './user.repository.js'
import { withFileLock } from '../utils/fileLock.js'

export class JsonUserRepository implements UserRepository {
  private cache: User[] | null = null

  constructor(
    private readonly dataFilePath: string = path.join(import.meta.dirname, '../data/users.json'),
  ) {}

  private load(): User[] {
    if (this.cache === null) {
      const raw = readFileSync(this.dataFilePath, 'utf-8')
      this.cache = JSON.parse(raw) as User[]
    }
    return this.cache
  }

  private readFromDisk(): User[] {
    const raw = readFileSync(this.dataFilePath, 'utf-8')
    return JSON.parse(raw) as User[]
  }

  findAll(): User[] {
    return this.load()
  }

  findByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase()
    return this.load().find((user) => user.email.toLowerCase() === normalized)
  }

  findById(id: string): User | undefined {
    return this.load().find((user) => user.id === id)
  }

  countActiveAdmins(excludeId?: string): number {
    return this.load().filter(
      (user) => user.role === 'ROLE_ADMIN' && user.ativo && user.id !== excludeId,
    ).length
  }

  create(user: User): User {
    return withFileLock(this.dataFilePath, () => {
      // Relê do disco dentro do lock, mesmo padrão do ResourceRepository — evita
      // "lost update" entre processos concorrentes escrevendo no mesmo arquivo.
      const users = this.readFromDisk()
      users.push(user)
      this.persist(users)
      return user
    })
  }

  update(id: string, patch: Partial<User>): User | undefined {
    return withFileLock(this.dataFilePath, () => {
      const users = this.readFromDisk()
      const index = users.findIndex((user) => user.id === id)
      if (index === -1) return undefined

      const updated = { ...users[index], ...patch, id: users[index].id }
      users[index] = updated
      this.persist(users)
      return updated
    })
  }

  private persist(users: User[]): void {
    const tempPath = `${this.dataFilePath}.tmp`
    writeFileSync(tempPath, JSON.stringify(users, null, 2), 'utf-8')
    renameSync(tempPath, this.dataFilePath)
    this.cache = users
  }
}
