import type { ResourceHealth } from '../models/resource.model.js'

/**
 * Armazenamento em memória do último resultado de health check de cada
 * recurso — não há banco de dados nesta sprint. O Map é populado pelas
 * varreduras periódicas do HealthCheckService e lido pelas rotas
 * GET /health/resources[/:id]. Perde-se ao reiniciar o processo, o que
 * é aceitável: o próximo sweep repovoa tudo em poucos segundos.
 */
export class HealthRepository {
  private readonly cache = new Map<string, ResourceHealth>()

  set(health: ResourceHealth): void {
    this.cache.set(health.resourceId, health)
  }

  getById(resourceId: string): ResourceHealth | undefined {
    return this.cache.get(resourceId)
  }

  getAll(): ResourceHealth[] {
    return Array.from(this.cache.values())
  }
}
