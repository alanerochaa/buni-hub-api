import type { ResourceEnvironment, ResourceType } from '../models/resource.model.js'

export type DashboardResourceStatus = 'online' | 'offline' | 'maintenance' | 'unknown'

export interface DashboardCategoryCounts {
  total: number
  online: number
  offline: number
  maintenance: number
  unknown: number
}

export interface DashboardSummary {
  total: number
  online: number
  offline: number
  maintenance: number
  unknown: number
  availabilityPercentage: number
  byType: Record<ResourceType, DashboardCategoryCounts>
  lastSweepAt: string | null
}

export interface DashboardIncidentEnvironment {
  environment: ResourceEnvironment
  status: DashboardResourceStatus
  lastCheckedAt: string
  offlineSince?: string
}

export interface DashboardIncident {
  id: string
  name: string
  type: ResourceType
  status: DashboardResourceStatus
  environments: DashboardIncidentEnvironment[]
}

export interface DashboardResponse {
  summary: DashboardSummary
  incidents: DashboardIncident[]
}
