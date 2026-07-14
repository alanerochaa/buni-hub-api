import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Resource } from '../models/resource.model.js'

/**
 * Única camada que conhece a origem dos dados (resources.json no
 * disco). Carrega o arquivo uma vez e mantém em cache em memória —
 * não há banco de dados nesta sprint, então recarregar o mesmo JSON a
 * cada requisição seria custo sem benefício.
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
}
