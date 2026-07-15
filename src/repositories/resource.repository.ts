import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Resource } from '../models/resource.model.js'

/**
 * Única camada que conhece a origem dos dados (resources.json no
 * disco). Carrega o arquivo uma vez e mantém em cache em memória —
 * não há banco de dados nesta sprint, então recarregar o mesmo JSON a
 * cada requisição seria custo sem benefício. Os métodos de escrita
 * (create/update/remove) atualizam o cache e persistem no mesmo
 * arquivo, mantendo o cache sempre a fonte de verdade em memória.
 */
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

  findAll(): Resource[] {
    return this.load()
  }

  findById(id: string): Resource | undefined {
    return this.load().find((resource) => resource.id === id)
  }

  create(resource: Resource): Resource {
    const resources = this.load()
    resources.push(resource)
    this.persist()
    return resource
  }

  update(id: string, patch: Partial<Resource>): Resource | undefined {
    const resources = this.load()
    const index = resources.findIndex((resource) => resource.id === id)
    if (index === -1) return undefined

    const updated = { ...resources[index], ...patch, id: resources[index].id }
    resources[index] = updated
    this.persist()
    return updated
  }

  remove(id: string): boolean {
    const resources = this.load()
    const index = resources.findIndex((resource) => resource.id === id)
    if (index === -1) return false

    resources.splice(index, 1)
    this.persist()
    return true
  }

  /**
   * Escreve o array atual em disco de forma atômica (arquivo temporário
   * + rename) para não deixar resources.json corrompido caso o processo
   * seja interrompido no meio da escrita.
   */
  private persist(): void {
    const tempPath = `${this.dataFilePath}.tmp`
    writeFileSync(tempPath, JSON.stringify(this.cache, null, 2), 'utf-8')
    renameSync(tempPath, this.dataFilePath)
  }
}
