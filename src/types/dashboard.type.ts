import type { ResourceEnvironment, ResourceType } from '../models/resource.model.js'

/**
 * Status consolidado do Painel Operacional — diferente de
 * `ResourceStatus` (que reflete só o resultado do health check HTTP).
 * 'maintenance' é derivado de `Resource.active === false`: um recurso
 * marcado como inativo no Cadastro de Recursos é tratado como "em
 * manutenção" no painel, independentemente do que o health check diga
 * (ele foi tirado de operação intencionalmente).
 */
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
  /** 0–100, arredondado a 2 casas decimais. */
  availabilityPercentage: number
  byType: Record<ResourceType, DashboardCategoryCounts>
  lastSweepAt: string | null
}

export interface DashboardIncident {
  id: string
  name: string
  type: ResourceType
  environment: ResourceEnvironment
  status: DashboardResourceStatus
  lastCheckedAt: string
  /** Presente apenas quando status === 'offline'. */
  offlineSince?: string
}

export interface DashboardResponse {
  summary: DashboardSummary
  incidents: DashboardIncident[]
}
