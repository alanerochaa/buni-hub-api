import { randomUUID } from 'node:crypto'
import type { EventRepository, OperationalEvent } from '../models/event.model.js'
import type { ResourceType } from '../models/resource.model.js'
import type { DashboardResourceStatus } from '../types/dashboard.type.js'

export interface ResourceStatusObservation {
  resourceId: string
  resourceName: string
  resourceType: ResourceType
  currentStatus: DashboardResourceStatus
  hasUrl: boolean
  httpStatus?: number
  responseTime?: number
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
 * Detecta transições reais de status por recurso e grava um
 * `OperationalEvent` só quando o status muda — nunca a cada sweep. O
 * status anterior de cada recurso vive em memória (`lastKnownStatus`),
 * semeado a partir do último evento persistido no boot: a primeira
 * observação de um recurso nunca vira evento (senão todo restart do
 * processo geraria um evento "fantasma" para cada recurso monitorado).
 */
export class EventService {
  private readonly lastKnownStatus = new Map<string, DashboardResourceStatus>()

  constructor(private readonly repository: EventRepository) {
    for (const event of repository.findAll()) {
      this.lastKnownStatus.set(event.resourceId, event.currentStatus)
    }
  }

  recordObservation(observation: ResourceStatusObservation): void {
    const previousStatus = this.lastKnownStatus.get(observation.resourceId)
    this.lastKnownStatus.set(observation.resourceId, observation.currentStatus)

    if (previousStatus === undefined || previousStatus === observation.currentStatus) {
      return
    }

    const event: OperationalEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      resourceId: observation.resourceId,
      resourceName: observation.resourceName,
      resourceType: observation.resourceType,
      previousStatus,
      currentStatus: observation.currentStatus,
      reason: deriveReason(observation),
      responseTime: observation.responseTime,
      httpStatus: observation.httpStatus,
    }
    this.repository.append(event)
  }

  /** Mais recente primeiro. */
  getEvents(): OperationalEvent[] {
    return [...this.repository.findAll()].reverse()
  }
}
