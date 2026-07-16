import { randomUUID } from 'node:crypto'
import type {
  OperationalEvent,
  OperationalLogFilters,
  OperationalLogOrigin,
  OperationalLogRepository,
} from '../models/operationalLog.model.js'
import type { ResourceEnvironment, ResourceType } from '../models/resource.model.js'
import type { DashboardResourceStatus } from '../types/dashboard.type.js'

export interface ResourceStatusObservation {
  resourceId: string
  resourceName: string
  resourceType: ResourceType
  environment: ResourceEnvironment
  currentStatus: DashboardResourceStatus
  hasUrl: boolean
  resourceUrl?: string
  httpStatus?: number
  responseTime?: number
  errorMessage?: string
  origin: OperationalLogOrigin
}

function deriveReason(observation: ResourceStatusObservation): string {
  if (observation.currentStatus === 'maintenance') return 'Recurso marcado como inativo no cadastro'
  if (!observation.hasUrl) return 'Sem URL cadastrada'
  if (observation.currentStatus === 'offline') {
    return observation.httpStatus ? `HTTP ${observation.httpStatus}` : 'Falha de conexão'
  }
  if (observation.currentStatus === 'online') return 'Recurso respondendo normalmente'
  return 'Resposta do servidor não determina o status'
}

/**
 * Implementa o **Log Operacional**: detecta transições reais de status
 * por recurso e grava um `OperationalEvent` só quando o status muda —
 * nunca a cada sweep (ao contrário do Histórico Operacional, que grava
 * um snapshot sempre — ver HistoryService). O status anterior de cada
 * recurso vive em memória (`lastKnownStatus`), semeado a partir do
 * último evento persistido no boot: a primeira observação de um recurso
 * nunca vira evento (senão todo restart do processo geraria um evento
 * "fantasma" para cada recurso monitorado).
 *
 * `lastTransitionAt` guarda o instante da última mudança de status por
 * recurso (também semeado do log persistido) — é o que permite calcular
 * `unavailabilityDurationMs` num evento de recuperação sem depender de
 * nenhum outro serviço (HealthRepository.getOfflineSince, por exemplo,
 * já é limpo pelo próprio sweep antes deste código rodar).
 */
export class OperationalLogService {
  private readonly lastKnownStatus = new Map<string, DashboardResourceStatus>()
  private readonly lastTransitionAt = new Map<string, string>()

  constructor(private readonly repository: OperationalLogRepository) {
    for (const event of repository.findAll()) {
      this.lastKnownStatus.set(event.resourceId, event.currentStatus)
      this.lastTransitionAt.set(event.resourceId, event.timestamp)
    }
  }

  recordObservation(observation: ResourceStatusObservation): void {
    const previousStatus = this.lastKnownStatus.get(observation.resourceId)
    const now = new Date()
    const nowIso = now.toISOString()

    if (previousStatus === undefined || previousStatus === observation.currentStatus) {
      if (previousStatus === undefined) {
        this.lastKnownStatus.set(observation.resourceId, observation.currentStatus)
        this.lastTransitionAt.set(observation.resourceId, nowIso)
      }
      return
    }

    let unavailabilityDurationMs: number | undefined
    if (previousStatus === 'offline') {
      const offlineStartedAt = this.lastTransitionAt.get(observation.resourceId)
      if (offlineStartedAt) {
        unavailabilityDurationMs = now.getTime() - new Date(offlineStartedAt).getTime()
      }
    }

    this.lastKnownStatus.set(observation.resourceId, observation.currentStatus)
    this.lastTransitionAt.set(observation.resourceId, nowIso)

    const event: OperationalEvent = {
      id: randomUUID(),
      timestamp: nowIso,
      resourceId: observation.resourceId,
      resourceName: observation.resourceName,
      resourceType: observation.resourceType,
      environment: observation.environment,
      previousStatus,
      currentStatus: observation.currentStatus,
      reason: deriveReason(observation),
      responseTime: observation.responseTime,
      httpStatus: observation.httpStatus,
      resourceUrl: observation.resourceUrl,
      errorMessage: observation.currentStatus === 'offline' ? observation.errorMessage : undefined,
      unavailabilityDurationMs,
      origin: observation.origin,
    }
    this.repository.append(event)
  }

  /** Mais recente primeiro, com filtros opcionais aplicados em memória. */
  getOperationalLog(filters: OperationalLogFilters = {}): OperationalEvent[] {
    let events = [...this.repository.findAll()].reverse()

    if (filters.resourceId) {
      events = events.filter((event) => event.resourceId === filters.resourceId)
    }
    if (filters.status) {
      events = events.filter((event) => event.currentStatus === filters.status)
    }
    if (filters.environment) {
      events = events.filter((event) => event.environment === filters.environment)
    }
    if (filters.since) {
      events = events.filter((event) => event.timestamp >= filters.since!)
    }
    if (filters.until) {
      events = events.filter((event) => event.timestamp <= filters.until!)
    }

    return events
  }
}
