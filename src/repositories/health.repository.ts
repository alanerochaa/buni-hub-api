import type { ResourceHealth } from '../models/resource.model.js'

/**
 * Armazenamento em memória do último resultado de health check de cada
 * recurso — não há banco de dados nesta sprint. O Map é populado pelas
 * varreduras periódicas do HealthCheckService e lido pelas rotas
 * GET /health/resources[/:id] e GET /dashboard*. Perde-se ao reiniciar
 * o processo, o que é aceitável: o próximo sweep repovoa tudo em
 * poucos segundos.
 */
export class HealthRepository {
  private readonly cache = new Map<string, ResourceHealth>()
  // Instante em que cada recurso passou a 'offline' na varredura mais
  // recente (limpo assim que ele volta a responder). Usado pelo
  // Painel Operacional para calcular "tempo offline" nos incidentes.
  private readonly offlineSince = new Map<string, string>()

  set(health: ResourceHealth): void {
    const previous = this.cache.get(health.resourceId)

    if (health.status === 'offline') {
      if (previous?.status !== 'offline') {
        this.offlineSince.set(health.resourceId, health.lastCheckedAt)
      }
    } else {
      this.offlineSince.delete(health.resourceId)
    }

    this.cache.set(health.resourceId, health)
  }

  getById(resourceId: string): ResourceHealth | undefined {
    return this.cache.get(resourceId)
  }

  getAll(): ResourceHealth[] {
    return Array.from(this.cache.values())
  }

  getOfflineSince(resourceId: string): string | undefined {
    return this.offlineSince.get(resourceId)
  }
}
