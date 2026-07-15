import type { ResourceType } from './resource.model.js'
import type { DashboardResourceStatus } from '../types/dashboard.type.js'

/**
 * Uma mudança real de status de um recurso — nunca uma repetição do
 * mesmo status entre sweeps consecutivos (ver EventService). Só usa
 * dados já produzidos pelo Health Check (`httpStatus`/`responseTime`);
 * nenhuma chamada adicional é feita para gerar um evento.
 */
export interface OperationalEvent {
  id: string
  timestamp: string
  resourceId: string
  resourceName: string
  resourceType: ResourceType
  previousStatus: DashboardResourceStatus
  currentStatus: DashboardResourceStatus
  reason: string
  responseTime?: number
  httpStatus?: number
}

/**
 * Porta de persistência de eventos — mesma lógica de `HistoryRepository`
 * (troca de implementação sem tocar em Service/Controller).
 */
export interface EventRepository {
  append(event: OperationalEvent): void
  findAll(): OperationalEvent[]
}
