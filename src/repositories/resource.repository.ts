import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Resource } from '../models/resource.model.js'
import { withFileLock } from '../utils/fileLock.js'

/** Campos que podem ser explicitamente removidos (não só setados como `undefined`) de um `Resource` persistido. */
export type RemovableResourceField = 'displayName'

export interface ResourceFieldUpdate {
  id: string
  patch: Partial<Resource>
  /**
   * Remove a chave do objeto antes de persistir — diferente de setar o campo como
   * `undefined` no patch, que só funciona porque `JSON.stringify` descarta chaves
   * `undefined` implicitamente. Aqui a remoção é explícita (`delete`), independente
   * desse comportamento.
   */
  removeFields?: RemovableResourceField[]
}

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

  /**
   * Aplica um ou mais patches sob um único lock e uma única escrita em disco — usado
   * quando uma edição precisa atualizar mais de um registro de forma atômica (ex.:
   * propagar `name` para o par HML/PROD do mesmo recurso lógico). IDs inexistentes
   * são ignorados silenciosamente, mesmo padrão de `update()`.
   */
  updateMany(updates: ResourceFieldUpdate[]): Resource[] {
    return withFileLock(this.dataFilePath, () => {
      const resources = this.readFromDisk()
      const updated: Resource[] = []

      for (const { id, patch, removeFields } of updates) {
        const index = resources.findIndex((resource) => resource.id === id)
        if (index === -1) continue

        const merged: Resource = { ...resources[index], ...patch, id: resources[index].id }
        for (const field of removeFields ?? []) {
          delete merged[field]
        }

        resources[index] = merged
        updated.push(merged)
      }

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
