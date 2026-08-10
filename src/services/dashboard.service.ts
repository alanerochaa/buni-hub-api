import type { ResourceRepository } from '../repositories/resource.repository.js'
import type { HealthCheckService } from './healthCheck.service.js'
import type { ResourceEnvironment, ResourceHealth, ResourceType } from '../models/resource.model.js'
import type {
  DashboardCategoryCounts,
  DashboardIncident,
  DashboardRankingEntry,
  DashboardResourceStatus,
  DashboardSummary,
} from '../types/dashboard.type.js'
import { averageResponseTime, calculateAvailabilityPercentage } from '../utils/dashboardStatus.js'
import {
  groupResourcesForDashboard,
  type DashboardResourceGroup,
} from '../utils/groupResourcesForDashboard.js'

const STATUS_PRIORITY: Record<DashboardResourceStatus, number> = {
  offline: 0,
  unknown: 1,
  maintenance: 2,
  online: 3,
}

function emptyCounts(): DashboardCategoryCounts {
  return { total: 0, online: 0, offline: 0, maintenance: 0, unknown: 0, slow: 0 }
}

// Abaixo do intervalo real do health check (60s, HEALTH_CHECK_INTERVAL_MS) para nunca
// servir um agrupamento mais velho que o próprio ciclo de varredura — só evita
// recalcular o mesmo agrupamento repetidas vezes dentro da mesma janela de leitura
// (getSummary + getIncidents + getSlowestResources chamados em sequência para as
// mesmas requisições HTTP). Cache só em memória, nunca escrito em arquivo.
const GROUPS_CACHE_TTL_MS = 15_000

export class DashboardService {
  private groupsCache: { computedAt: number; groups: DashboardResourceGroup[] } | null = null

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
    const byEnvironment: Record<ResourceEnvironment, DashboardCategoryCounts> = {
      homologacao: emptyCounts(),
      producao: emptyCounts(),
      unknown: emptyCounts(),
    }

    for (const group of groups) {
      const isSlowGroup = group.environments.some((entry) => entry.slow)
      this.accumulate(totals, group.status, isSlowGroup)
      this.accumulate(byType[group.type], group.status, isSlowGroup)

      for (const entry of group.environments) {
        this.accumulate(byEnvironment[entry.environment], entry.status, entry.slow)
      }
    }

    const allResources = this.resourceRepository.findAll()
    const withUrl = allResources.filter((resource) => Boolean(resource.url)).length

    return {
      ...totals,
      availabilityPercentage: calculateAvailabilityPercentage(totals.online, totals.total),
      averageResponseTimeMs: averageResponseTime(this.healthCheckService.getAll()),
      monitoredPercentage:
        allResources.length > 0
          ? calculateAvailabilityPercentage(withUrl, allResources.length)
          : 100,
      byType,
      byEnvironment,
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

  /** Top N recursos pelo maior tempo de resposta observado no check mais recente (dado real, sem P95 — não há série histórica por recurso para calcular percentil). */
  getSlowestResources(limit = 5): DashboardRankingEntry[] {
    const entries: DashboardRankingEntry[] = []

    for (const group of this.buildGroups()) {
      const withResponseTime = group.environments.filter(
        (entry): entry is typeof entry & { responseTime: number } =>
          typeof entry.responseTime === 'number',
      )
      if (withResponseTime.length === 0) continue

      const worst = withResponseTime.reduce((slowest, current) =>
        current.responseTime > slowest.responseTime ? current : slowest,
      )
      entries.push({
        id: group.id,
        name: group.name,
        type: group.type,
        environment: worst.environment,
        value: worst.responseTime,
      })
    }

    return entries.sort((a, b) => b.value - a.value).slice(0, limit)
  }

  private buildGroups(): DashboardResourceGroup[] {
    const now = Date.now()
    if (this.groupsCache && now - this.groupsCache.computedAt < GROUPS_CACHE_TTL_MS) {
      return this.groupsCache.groups
    }

    const groups = groupResourcesForDashboard(
      this.resourceRepository.findAll(),
      this.buildHealthMap(),
      (id) => this.healthCheckService.getOfflineSince(id),
    )
    this.groupsCache = { computedAt: now, groups }
    return groups
  }

  private buildHealthMap(): Map<string, ResourceHealth> {
    return new Map(this.healthCheckService.getAll().map((health) => [health.resourceId, health]))
  }

  private accumulate(
    counts: DashboardCategoryCounts,
    status: DashboardResourceStatus,
    slow: boolean,
  ): void {
    counts.total += 1
    counts[status] += 1
    if (slow) counts.slow += 1
  }
}
