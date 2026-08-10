import type { ResourceEnvironment, ResourceType } from '../models/resource.model.js'

export type DashboardResourceStatus = 'online' | 'offline' | 'maintenance' | 'unknown'

export interface DashboardCategoryCounts {
  total: number
  online: number
  offline: number
  maintenance: number
  unknown: number
  /** Subconjunto de `online` cujo último check foi classificado como lento (`slow`). */
  slow: number
}

export interface DashboardSummary {
  total: number
  online: number
  offline: number
  maintenance: number
  unknown: number
  slow: number
  availabilityPercentage: number
  /** Média do tempo de resposta (ms) dos checks mais recentes que têm esse dado — `null` se nenhum recurso tiver. */
  averageResponseTimeMs: number | null
  /** % de recursos com ao menos uma URL cadastrada em algum ambiente (ou seja, efetivamente monitorável). */
  monitoredPercentage: number
  byType: Record<ResourceType, DashboardCategoryCounts>
  byEnvironment: Record<ResourceEnvironment, DashboardCategoryCounts>
  lastSweepAt: string | null
}

export interface DashboardIncidentEnvironment {
  environment: ResourceEnvironment
  status: DashboardResourceStatus
  lastCheckedAt: string
  offlineSince?: string
  httpStatus?: number
  responseTime?: number
  errorMessage?: string
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

export interface DashboardRankingEntry {
  id: string
  name: string
  type: ResourceType
  environment: ResourceEnvironment
  value: number
}

export interface DashboardRankings {
  /** Maiores tempos de resposta observados agora (ms), desc. */
  slowest: DashboardRankingEntry[]
  /** Mais transições para offline nas últimas 24h, desc. */
  mostUnstable: DashboardRankingEntry[]
}

/** Payload agregado consumido pela tela principal do painel — mesmos dados de `/dashboard` + `/dashboard/rankings`, numa única resposta. */
export interface DashboardOverview {
  summary: DashboardSummary
  incidents: DashboardIncident[]
  rankings: DashboardRankings
}
