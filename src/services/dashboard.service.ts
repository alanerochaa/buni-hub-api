import type { ResourceRepository } from '../repositories/resource.repository.js'
import type { HealthCheckService } from './healthCheck.service.js'
import type { ResourceHealth, ResourceType } from '../models/resource.model.js'
import type {
  DashboardCategoryCounts,
  DashboardIncident,
  DashboardResourceStatus,
  DashboardSummary,
} from '../types/dashboard.type.js'
import { calculateAvailabilityPercentage } from '../utils/dashboardStatus.js'
import { groupResourcesForDashboard, type DashboardResourceGroup } from '../utils/groupResourcesForDashboard.js'

const STATUS_PRIORITY: Record<DashboardResourceStatus, number> = {
  offline: 0,
  unknown: 1,
  maintenance: 2,
  online: 3,
}

function emptyCounts(): DashboardCategoryCounts {
  return { total: 0, online: 0, offline: 0, maintenance: 0, unknown: 0 }
}

export class DashboardService {
  constructor(
    private readonly resourceRepository: ResourceRepository,
    private readonly healthCheckService: HealthCheckService,
  ) {}

  getSummary(): DashboardSummary {
    const groups = this.buildGroups()

    const totals = emptyCounts()
    const byType: Record<ResourceType, DashboardCategoryCounts> = {
      api: emptyCounts(),
      'web-service': emptyCounts(),
      site: emptyCounts(),
    }

    for (const group of groups) {
      this.accumulate(totals, group.status)
      this.accumulate(byType[group.type], group.status)
    }

    return {
      ...totals,
      availabilityPercentage: calculateAvailabilityPercentage(totals.online, totals.total),
      byType,
      lastSweepAt: this.healthCheckService.getLastSweepAt(),
    }
  }

  getIncidents(): DashboardIncident[] {
    const incidents: DashboardIncident[] = this.buildGroups()
      .filter((group) => group.status !== 'online')
      .map((group) => ({
        id: group.id,
        name: group.name,
        type: group.type,
        status: group.status,
        environments: group.environments,
      }))

    return incidents.sort((a, b) => {
      const priorityDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
      if (priorityDiff !== 0) return priorityDiff
      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }

  private buildGroups(): DashboardResourceGroup[] {
    return groupResourcesForDashboard(this.resourceRepository.findAll(), this.buildHealthMap(), (id) =>
      this.healthCheckService.getOfflineSince(id),
    )
  }

  private buildHealthMap(): Map<string, ResourceHealth> {
    return new Map(this.healthCheckService.getAll().map((health) => [health.resourceId, health]))
  }

  private accumulate(counts: DashboardCategoryCounts, status: DashboardResourceStatus): void {
    counts.total += 1
    counts[status] += 1
  }
}
