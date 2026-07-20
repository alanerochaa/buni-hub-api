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

export class HealthCheckService {
  private lastSweepAt: string | null = null

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

    this.lastSweepAt = new Date().toISOString()
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

  getOfflineSince(resourceId: string): string | undefined {
    return this.healthRepository.getOfflineSince(resourceId)
  }

  getLastSweepAt(): string | null {
    return this.lastSweepAt
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
    } catch (error) {
      const errorMessage = controller.signal.aborted
        ? `Tempo limite excedido (${this.options.timeoutMs}ms)`
        : error instanceof Error
          ? error.message
          : 'Erro desconhecido ao verificar o recurso'

      
      return { resourceId: resource.id, status: 'offline', lastCheckedAt, errorMessage }
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
