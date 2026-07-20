import type { ResourceEnvironment, ResourceType } from './resource.model.js'
import type { DashboardResourceStatus } from '../types/dashboard.type.js'


export type OperationalLogOrigin = 'scheduled-sweep' | 'manual'

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

  environment?: ResourceEnvironment
  resourceUrl?: string
  errorMessage?: string
  unavailabilityDurationMs?: number
  origin?: OperationalLogOrigin
}

export interface OperationalLogFilters {
  resourceId?: string
  status?: DashboardResourceStatus
  environment?: ResourceEnvironment
  since?: string
  until?: string
}

export interface OperationalLogRepository {
  append(event: OperationalEvent): void
  findAll(): OperationalEvent[]
}
