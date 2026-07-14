import type { ResourceRepository } from '../repositories/resource.repository.js'
import type { Resource, ResourceEnvironment, ResourceType } from '../models/resource.model.js'
import type { ResourceSummary } from '../types/resourceSummary.type.js'
import { ApiError } from '../utils/ApiError.js'
import { normalizeSearchTerm } from '../utils/normalizeSearchTerm.js'

export interface ResourceQuery {
  type?: ResourceType
  environment?: ResourceEnvironment
  search?: string
}

/**
 * Regras de negócio do catálogo: filtragem, ordenação e agregações.
 * Não conhece Express — recebe e devolve apenas tipos de domínio, o
 * que permite reutilizar esta classe em qualquer camada de entrega
 * (HTTP hoje, CLI ou fila no futuro, se necessário).
 */
export class ResourceService {
  constructor(private readonly repository: ResourceRepository) {}

  listResources(query: ResourceQuery = {}): Resource[] {
    const resources = this.repository
      .findAll()
      .filter((resource) => this.matchesQuery(resource, query))

    return [...resources].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  getResourceById(id: string): Resource {
    const resource = this.repository.findById(id)
    if (!resource) {
      throw ApiError.notFound(`Recurso não encontrado: ${id}`)
    }
    return resource
  }

  getSummary(): ResourceSummary {
    const resources = this.repository.findAll()

    return {
      total: resources.length,
      apis: resources.filter((resource) => resource.type === 'api').length,
      webServices: resources.filter((resource) => resource.type === 'web-service').length,
      sites: resources.filter((resource) => resource.type === 'site').length,
    }
  }

  private matchesQuery(resource: Resource, query: ResourceQuery): boolean {
    if (query.type && resource.type !== query.type) return false
    if (query.environment && resource.environment !== query.environment) return false
    return this.matchesSearch(resource, query.search)
  }

  private matchesSearch(resource: Resource, search: string | undefined): boolean {
    const normalized = search ? normalizeSearchTerm(search) : ''
    if (!normalized) return true

    const words = normalized.split(/\s+/).filter(Boolean)
    return words.every((word) => resource.searchIndex.some((entry) => entry.includes(word)))
  }
}
