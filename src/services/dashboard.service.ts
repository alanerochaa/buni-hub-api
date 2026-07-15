import type { ResourceRepository } from '../repositories/resource.repository.js'
import type { HealthCheckService } from './healthCheck.service.js'
import type { Resource, ResourceHealth, ResourceType } from '../models/resource.model.js'
import type {
  DashboardCategoryCounts,
  DashboardIncident,
  DashboardResourceStatus,
  DashboardSummary,
} from '../types/dashboard.type.js'

// Quanto menor, mais urgente — determina a ordem da tabela de
// incidentes. 'online' nunca aparece nos incidentes (filtrado antes).
const STATUS_PRIORITY: Record<DashboardResourceStatus, number> = {
  offline: 0,
  unknown: 1,
  maintenance: 2,
  online: 3,
}

function emptyCounts(): DashboardCategoryCounts {
  return { total: 0, online: 0, offline: 0, maintenance: 0, unknown: 0 }
}

/**
 * Agrega Resource + ResourceHealth (já mantidos por
 * ResourceRepository/HealthCheckService) na visão consolidada do
 * Painel Operacional. Não faz nenhuma checagem HTTP própria — apenas
 * lê o estado mais recente já calculado pelo sweep periódico.
 */
export class DashboardService {
  constructor(
    private readonly resourceRepository: ResourceRepository,
    private readonly healthCheckService: HealthCheckService,
  ) {}

  getSummary(): DashboardSummary {
    const resources = this.resourceRepository.findAll()
    const healthByResourceId = this.buildHealthMap()

    const totals = emptyCounts()
    const byType: Record<ResourceType, DashboardCategoryCounts> = {
      api: emptyCounts(),
      'web-service': emptyCounts(),
      site: emptyCounts(),
    }

    for (const resource of resources) {
      const status = this.resolveStatus(resource, healthByResourceId.get(resource.id))
      this.accumulate(totals, status)
      this.accumulate(byType[resource.type], status)
    }

    return {
      ...totals,
      availabilityPercentage: this.calculateAvailability(totals),
      byType,
      lastSweepAt: this.healthCheckService.getLastSweepAt(),
    }
  }

  getIncidents(): DashboardIncident[] {
    const resources = this.resourceRepository.findAll()
    const healthByResourceId = this.buildHealthMap()

    const incidents: DashboardIncident[] = []

    for (const resource of resources) {
      const health = healthByResourceId.get(resource.id)
      const status = this.resolveStatus(resource, health)
      if (status === 'online') continue

      incidents.push({
        id: resource.id,
        name: resource.displayName ?? resource.name,
        type: resource.type,
        environment: resource.environment,
        status,
        lastCheckedAt: health?.lastCheckedAt ?? new Date().toISOString(),
        offlineSince:
          status === 'offline' ? this.healthCheckService.getOfflineSince(resource.id) : undefined,
      })
    }

    return incidents.sort((a, b) => {
      const priorityDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
      if (priorityDiff !== 0) return priorityDiff

      if (a.status === 'offline' && b.status === 'offline') {
        return (a.offlineSince ?? '').localeCompare(b.offlineSince ?? '')
      }
      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }

  private buildHealthMap(): Map<string, ResourceHealth> {
    return new Map(this.healthCheckService.getAll().map((health) => [health.resourceId, health]))
  }

  private resolveStatus(resource: Resource, health: ResourceHealth | undefined): DashboardResourceStatus {
    if (!resource.active) return 'maintenance'

    const status = health?.status ?? 'unknown'
    if (status === 'online' || status === 'slow') return 'online'
    if (status === 'offline') return 'offline'
    return 'unknown'
  }

  private accumulate(counts: DashboardCategoryCounts, status: DashboardResourceStatus): void {
    counts.total += 1
    counts[status] += 1
  }

  private calculateAvailability(counts: DashboardCategoryCounts): number {
    if (counts.total === 0) return 100
    return Math.round((counts.online / counts.total) * 10_000) / 100
  }
}
