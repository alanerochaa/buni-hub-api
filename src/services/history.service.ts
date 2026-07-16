import type { HistoryRepository, HistorySnapshot } from '../models/history.model.js'
import type { OperationalEvent, OperationalLogFilters } from '../models/operationalLog.model.js'
import type { Resource, ResourceHealth } from '../models/resource.model.js'
import type { OperationalLogService } from './operationalLog.service.js'
import { calculateAvailabilityPercentage, resolveResourceStatus } from '../utils/dashboardStatus.js'

/**
 * Orquestra os dois pilares do módulo de auditoria a cada sweep do
 * Health Check: grava um `HistorySnapshot` agregado (**Histórico
 * Operacional** — métricas e série temporal, sempre) e delega ao
 * `OperationalLogService` a detecção de transições por recurso
 * (**Log Operacional** — eventos detalhados e auditoria, só quando o
 * status de fato muda). Não faz nenhuma chamada HTTP própria — só lê o
 * resultado que `HealthCheckService` já calculou.
 */
export class HistoryService {
  constructor(
    private readonly historyRepository: HistoryRepository,
    private readonly operationalLogService: OperationalLogService,
  ) {}

  recordSweepResult(resources: Resource[], healthByResourceId: Map<string, ResourceHealth>): void {
    const counts = { total: 0, online: 0, offline: 0, maintenance: 0, unknown: 0 }

    for (const resource of resources) {
      const health = healthByResourceId.get(resource.id)
      const status = resolveResourceStatus(resource, health)

      counts.total += 1
      counts[status] += 1

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
      ...counts,
      availabilityPercentage: calculateAvailabilityPercentage(counts.online, counts.total),
    }
    this.historyRepository.append(snapshot)
  }

  /** Histórico Operacional — métricas agregadas e série temporal (`GET /dashboard/history`). */
  getHistory(): HistorySnapshot[] {
    return this.historyRepository.findAll()
  }

  /** Log Operacional — eventos detalhados e auditoria (`GET /dashboard/events`). */
  getOperationalLog(filters?: OperationalLogFilters): OperationalEvent[] {
    return this.operationalLogService.getOperationalLog(filters)
  }
}
