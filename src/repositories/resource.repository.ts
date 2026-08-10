import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Resource } from '../models/resource.model.js'
import { withFileLock } from '../utils/fileLock.js'

export class ResourceRepository {
  private cache: Resource[] | null = null

  constructor(
    private readonly dataFilePath: string = path.join(
      import.meta.dirname,
      '../data/resources.json',
    ),
  ) {}

  private load(): Resource[] {
    if (this.cache === null) {
      const raw = readFileSync(this.dataFilePath, 'utf-8')
      this.cache = JSON.parse(raw) as Resource[]
    }
    return this.cache
  }

  private readFromDisk(): Resource[] {
    const raw = readFileSync(this.dataFilePath, 'utf-8')
    return JSON.parse(raw) as Resource[]
  }

  findAll(): Resource[] {
    return this.load()
  }

  findById(id: string): Resource | undefined {
    return this.load().find((resource) => resource.id === id)
  }

  create(resource: Resource): Resource {
    return withFileLock(this.dataFilePath, () => {
      // Relê do disco dentro do lock: garante que a mutação parte do estado mais
      // recente, mesmo que outro processo tenha gravado entre a última leitura
      // deste processo e agora (evita "lost update" entre processos concorrentes).
      const resources = this.readFromDisk()
      resources.push(resource)
      this.persist(resources)
      return resource
    })
  }

  update(id: string, patch: Partial<Resource>): Resource | undefined {
    return withFileLock(this.dataFilePath, () => {
      const resources = this.readFromDisk()
      const index = resources.findIndex((resource) => resource.id === id)
      if (index === -1) return undefined

      const updated = { ...resources[index], ...patch, id: resources[index].id }
      resources[index] = updated
      this.persist(resources)
      return updated
    })
  }

  remove(id: string): boolean {
    return withFileLock(this.dataFilePath, () => {
      const resources = this.readFromDisk()
      const index = resources.findIndex((resource) => resource.id === id)
      if (index === -1) return false

      resources.splice(index, 1)
      this.persist(resources)
      return true
    })
  }

  private persist(resources: Resource[]): void {
    const tempPath = `${this.dataFilePath}.tmp`
    writeFileSync(tempPath, JSON.stringify(resources, null, 2), 'utf-8')
    renameSync(tempPath, this.dataFilePath)
    this.cache = resources
  }
}
