import type { ResourceRepository } from '../repositories/resource.repository.js'
import type { HealthRepository } from '../repositories/health.repository.js'
import type { Resource, ResourceHealth, ResourceStatus } from '../models/resource.model.js'
import { ApiError } from '../utils/ApiError.js'
import { runWithConcurrency } from '../utils/promisePool.js'

export interface HealthCheckOptions {
  timeoutMs: number
  slowThresholdMs: number
  concurrency: number
}

/**
 * Faz a checagem real (HTTP) de cada recurso e mantém o resultado mais
 * recente em memória (HealthRepository). Não conhece Express — só
 * domínio e regras de classificação.
 *
 * Classificação:
 * - sem URL cadastrada           -> unknown  (não há o que checar)
 * - timeout / erro de rede / DNS -> offline
 * - HTTP >= 500                  -> offline
 * - HTTP 2xx/3xx dentro do prazo -> online
 * - HTTP 2xx/3xx acima do prazo  -> slow
 * - qualquer outro caso (4xx...) -> unknown (resposta do servidor não
 *   indica claramente que o recurso está fora do ar)
 */
export class HealthCheckService {
  constructor(
    private readonly resourceRepository: ResourceRepository,
    private readonly healthRepository: HealthRepository,
    private readonly options: HealthCheckOptions,
  ) {}

  async runSweep(): Promise<void> {
    const resources = this.resourceRepository.findAll()

    await runWithConcurrency(resources, this.options.concurrency, async (resource) => {
      const health = await this.checkOne(resource)
      this.healthRepository.set(health)
    })
  }

  getAll(): ResourceHealth[] {
    return this.resourceRepository.findAll().map((resource) => this.getOrDefault(resource.id))
  }

  getById(resourceId: string): ResourceHealth {
    const resource = this.resourceRepository.findById(resourceId)
    if (!resource) {
      throw ApiError.notFound(`Recurso não encontrado: ${resourceId}`)
    }
    return this.getOrDefault(resourceId)
  }

  private getOrDefault(resourceId: string): ResourceHealth {
    return (
      this.healthRepository.getById(resourceId) ?? {
        resourceId,
        status: 'unknown',
        lastCheckedAt: new Date().toISOString(),
      }
    )
  }

  private async checkOne(resource: Resource): Promise<ResourceHealth> {
    const lastCheckedAt = new Date().toISOString()

    if (!resource.url) {
      return { resourceId: resource.id, status: 'unknown', lastCheckedAt }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs)
    const startedAt = Date.now()

    try {
      const response = await fetch(resource.url, { method: 'GET', signal: controller.signal })
      const responseTime = Date.now() - startedAt

      return {
        resourceId: resource.id,
        status: this.classify(response.status, responseTime),
        httpStatus: response.status,
        responseTime,
        lastCheckedAt,
      }
    } catch {
      return { resourceId: resource.id, status: 'offline', lastCheckedAt }
    } finally {
      clearTimeout(timeout)
    }
  }

  private classify(httpStatus: number, responseTime: number): ResourceStatus {
    if (httpStatus >= 500) return 'offline'
    if (httpStatus >= 200 && httpStatus < 400) {
      return responseTime > this.options.slowThresholdMs ? 'slow' : 'online'
    }
    return 'unknown'
  }
}
