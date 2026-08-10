import type {
  HistoryRepository,
  HistorySnapshot,
  HistorySnapshotCategoryCounts,
} from '../models/history.model.js'
import type { OperationalEvent, OperationalLogFilters } from '../models/operationalLog.model.js'
import type { Resource, ResourceEnvironment, ResourceHealth } from '../models/resource.model.js'
import type { ResourceRepository } from '../repositories/resource.repository.js'
import type { DashboardRankingEntry } from '../types/dashboard.type.js'
import {
  averageResponseTime,
  calculateAvailabilityPercentage,
  isSlowResource,
  resolveResourceStatus,
} from '../utils/dashboardStatus.js'
import { getResourceIdentityKey } from '../utils/resourceIdentity.js'
import type { OperationalLogService } from './operationalLog.service.js'

function emptyCategoryCounts(): HistorySnapshotCategoryCounts {
  return { total: 0, online: 0, offline: 0, maintenance: 0, unknown: 0, slow: 0 }
}

export class HistoryService {
  constructor(
    private readonly historyRepository: HistoryRepository,
    private readonly operationalLogService: OperationalLogService,
    private readonly resourceRepository: ResourceRepository,
  ) {}

  recordSweepResult(resources: Resource[], healthByResourceId: Map<string, ResourceHealth>): void {
    const counts = { total: 0, online: 0, offline: 0, maintenance: 0, unknown: 0, slow: 0 }
    const byEnvironment: Record<ResourceEnvironment, HistorySnapshotCategoryCounts> = {
      homologacao: emptyCategoryCounts(),
      producao: emptyCategoryCounts(),
      unknown: emptyCategoryCounts(),
    }

    for (const resource of resources) {
      const health = healthByResourceId.get(resource.id)
      const status = resolveResourceStatus(resource, health)
      const slow = isSlowResource(resource, health)

      counts.total += 1
      counts[status] += 1
      if (slow) counts.slow += 1

      const envCounts = byEnvironment[resource.environment]
      envCounts.total += 1
      envCounts[status] += 1
      if (slow) envCounts.slow += 1

      this.operationalLogService.recordObservation({
        resourceId: resource.id,
        resourceName: resource.displayName ?? resource.name,
        resourceType: resource.type,
        environment: resource.environment,
        currentStatus: status,
        hasUrl: Boolean(resource.url),
        resourceUrl: resource.url,
        httpStatus: health?.httpStatus,
        responseTime: health?.responseTime,
        errorMessage: health?.errorMessage,
        origin: 'scheduled-sweep',
      })
    }

    const snapshot: HistorySnapshot = {
      timestamp: new Date().toISOString(),
      total: counts.total,
      online: counts.online,
      offline: counts.offline,
      maintenance: counts.maintenance,
      unknown: counts.unknown,
      availabilityPercentage: calculateAvailabilityPercentage(counts.online, counts.total),
      slow: counts.slow,
      averageResponseTimeMs: averageResponseTime([...healthByResourceId.values()]),
      byEnvironment,
    }
    this.historyRepository.append(snapshot)
  }

  getHistory(): HistorySnapshot[] {
    return this.historyRepository.findAll()
  }

  getOperationalLog(filters?: OperationalLogFilters): OperationalEvent[] {
    return this.operationalLogService.getOperationalLog(filters)
  }

  /**
   * Top N recursos por quantidade de transições para offline desde `sinceIso`
   * (dado real, lido de events.json — só conta mudanças de estado registradas,
   * nunca health checks isolados). Agrupa por chave de identidade (mesma lógica de
   * `groupResourcesForDashboard`) para não contar HML e Produção como recursos
   * diferentes.
   */
  getMostUnstable(sinceIso: string, limit = 5): DashboardRankingEntry[] {
    const offlineEvents = this.operationalLogService.getOperationalLog({
      status: 'offline',
      since: sinceIso,
    })

    const byKey = new Map<
      string,
      {
        name: string
        type: DashboardRankingEntry['type']
        environment: ResourceEnvironment
        count: number
      }
    >()

    for (const event of offlineEvents) {
      const resource = this.resourceRepository.findById(event.resourceId)
      const key = resource ? getResourceIdentityKey(resource) : `unknown:${event.resourceId}`
      const existing = byKey.get(key)
      if (existing) {
        existing.count += 1
        continue
      }
      byKey.set(key, {
        name: resource?.displayName ?? event.resourceName,
        type: event.resourceType,
        environment: event.environment ?? 'unknown',
        count: 1,
      })
    }

    return [...byKey.entries()]
      .map(([id, data]) => ({
        id,
        name: data.name,
        type: data.type,
        environment: data.environment,
        value: data.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
  }
}
