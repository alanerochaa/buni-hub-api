import type { HistoryRepository, HistorySnapshot } from '../models/history.model.js'
import type { OperationalEvent } from '../models/event.model.js'
import type { Resource, ResourceHealth } from '../models/resource.model.js'
import type { EventService } from './event.service.js'
import { calculateAvailabilityPercentage, resolveResourceStatus } from '../utils/dashboardStatus.js'

/**
 * Orquestra o Histórico Operacional: gera um `HistorySnapshot` a cada
 * sweep do Health Check e delega ao `EventService` a detecção de
 * transições por recurso. Não faz nenhuma chamada HTTP própria — só
 * lê o resultado que `HealthCheckService` já calculou.
 */
export class HistoryService {
  constructor(
    private readonly historyRepository: HistoryRepository,
    private readonly eventService: EventService,
  ) {}

  recordSweepResult(resources: Resource[], healthByResourceId: Map<string, ResourceHealth>): void {
    const counts = { total: 0, online: 0, offline: 0, maintenance: 0, unknown: 0 }

    for (const resource of resources) {
      const health = healthByResourceId.get(resource.id)
      const status = resolveResourceStatus(resource, health)

      counts.total += 1
      counts[status] += 1

      this.eventService.recordObservation({
        resourceId: resource.id,
        resourceName: resource.displayName ?? resource.name,
        resourceType: resource.type,
        currentStatus: status,
        hasUrl: Boolean(resource.url),
        httpStatus: health?.httpStatus,
        responseTime: health?.responseTime,
      })
    }

    const snapshot: HistorySnapshot = {
      timestamp: new Date().toISOString(),
      ...counts,
      availabilityPercentage: calculateAvailabilityPercentage(counts.online, counts.total),
    }
    this.historyRepository.append(snapshot)
  }

  getHistory(): HistorySnapshot[] {
    return this.historyRepository.findAll()
  }

  getEvents(): OperationalEvent[] {
    return this.eventService.getEvents()
  }
}
