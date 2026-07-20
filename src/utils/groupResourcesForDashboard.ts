import type { Resource, ResourceEnvironment, ResourceHealth, ResourceType } from '../models/resource.model.js'
import type { DashboardResourceStatus } from '../types/dashboard.type.js'
import { resolveResourceStatus } from './dashboardStatus.js'
import { getResourceIdentityKey } from './resourceIdentity.js'

export interface DashboardEnvironmentStatus {
  environment: ResourceEnvironment
  status: DashboardResourceStatus
  lastCheckedAt: string
  offlineSince?: string
}

export interface DashboardResourceGroup {
  id: string
  name: string
  type: ResourceType
  status: DashboardResourceStatus
  environments: DashboardEnvironmentStatus[]
}

const STATUS_SEVERITY: Record<DashboardResourceStatus, number> = {
  offline: 0,
  unknown: 1,
  maintenance: 2,
  online: 3,
}

const ENVIRONMENT_DISPLAY_ORDER: ResourceEnvironment[] = [
  'homologacao',
  'producao',
  'desenvolvimento',
  'unknown',
]


const ENVIRONMENT_PRIORITY: ResourceEnvironment[] = [
  'producao',
  'homologacao',
  'desenvolvimento',
  'unknown',
]

function pickRepresentative(entries: Resource[]): Resource {
  for (const environment of ENVIRONMENT_PRIORITY) {
    const match = entries.find((entry) => entry.environment === environment)
    if (match) return match
  }
  return entries[0]
}

function worstStatus(statuses: DashboardResourceStatus[]): DashboardResourceStatus {
  return statuses.reduce((worst, current) =>
    STATUS_SEVERITY[current] < STATUS_SEVERITY[worst] ? current : worst,
  )
}


export function groupResourcesForDashboard(
  resources: Resource[],
  healthByResourceId: Map<string, ResourceHealth>,
  getOfflineSince: (resourceId: string) => string | undefined,
): DashboardResourceGroup[] {
  const entriesByKey = new Map<string, Resource[]>()
  for (const resource of resources) {
    const key = getResourceIdentityKey(resource)
    const entries = entriesByKey.get(key)
    if (entries) entries.push(resource)
    else entriesByKey.set(key, [resource])
  }

  return Array.from(entriesByKey.values()).map((entries) => {
    const environments: DashboardEnvironmentStatus[] = entries
      .map((resource) => {
        const health = healthByResourceId.get(resource.id)
        const status = resolveResourceStatus(resource, health)
        return {
          environment: resource.environment,
          status,
          lastCheckedAt: health?.lastCheckedAt ?? new Date().toISOString(),
          offlineSince: status === 'offline' ? getOfflineSince(resource.id) : undefined,
        }
      })
      .sort(
        (a, b) =>
          ENVIRONMENT_DISPLAY_ORDER.indexOf(a.environment) -
          ENVIRONMENT_DISPLAY_ORDER.indexOf(b.environment),
      )

    const representative = pickRepresentative(entries)

    return {
      id: representative.id,
      name: representative.displayName ?? representative.name,
      type: representative.type,
      status: worstStatus(environments.map((entry) => entry.status)),
      environments,
    }
  })
}
