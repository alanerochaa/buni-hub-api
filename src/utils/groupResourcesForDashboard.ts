import type {
  Resource,
  ResourceEnvironment,
  ResourceHealth,
  ResourceType,
} from '../models/resource.model.js'
import type { DashboardResourceStatus } from '../types/dashboard.type.js'
import { isSlowResource, resolveResourceStatus } from './dashboardStatus.js'
import { getResourceIdentityKey } from './resourceIdentity.js'

export interface DashboardEnvironmentStatus {
  environment: ResourceEnvironment
  status: DashboardResourceStatus
  lastCheckedAt: string
  offlineSince?: string
  /** true quando este ambiente está online mas respondendo lento (subconjunto de status 'online'). */
  slow: boolean
  httpStatus?: number
  responseTime?: number
  errorMessage?: string
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

const ENVIRONMENT_DISPLAY_ORDER: ResourceEnvironment[] = ['homologacao', 'producao', 'unknown']

const ENVIRONMENT_PRIORITY: ResourceEnvironment[] = ['producao', 'homologacao', 'unknown']

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

/**
 * Agrupa por chave de identidade (type + code/nome) e, em seguida, funde grupos que
 * o `pairedResourceId` aponta como sendo o mesmo recurso lógico mas que a chave de
 * identidade separou (ex.: nome divergente entre HML e Produção). Espelha exatamente
 * o algoritmo de `web/src/features/catalog/groupResourcesByIdentity.ts` — o dashboard
 * e o catálogo precisam concordar sobre quais recursos são o mesmo par HML/PROD.
 */
export function groupResourcesForDashboard(
  resources: Resource[],
  healthByResourceId: Map<string, ResourceHealth>,
  getOfflineSince: (resourceId: string) => string | undefined,
): DashboardResourceGroup[] {
  const byId = new Map(resources.map((resource) => [resource.id, resource]))
  const keyByResourceId = new Map<string, string>()
  const entriesByKey = new Map<string, Resource[]>()
  for (const resource of resources) {
    const key = getResourceIdentityKey(resource)
    keyByResourceId.set(resource.id, key)
    const entries = entriesByKey.get(key)
    if (entries) entries.push(resource)
    else entriesByKey.set(key, [resource])
  }

  const redirect = new Map<string, string>()
  function resolveKey(key: string): string {
    let current = key
    while (redirect.has(current)) current = redirect.get(current)!
    return current
  }

  for (const resource of resources) {
    if (!resource.pairedResourceId) continue
    const paired = byId.get(resource.pairedResourceId)
    if (!paired) continue

    const keyA = resolveKey(keyByResourceId.get(resource.id)!)
    const keyB = resolveKey(keyByResourceId.get(paired.id)!)
    if (keyA === keyB) continue

    const entriesA = entriesByKey.get(keyA)!
    const entriesB = entriesByKey.get(keyB)
    if (!entriesB) continue

    entriesByKey.set(keyA, [...entriesA, ...entriesB])
    entriesByKey.delete(keyB)
    redirect.set(keyB, keyA)
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
          slow: isSlowResource(resource, health),
          httpStatus: health?.httpStatus,
          responseTime: health?.responseTime,
          errorMessage: health?.errorMessage,
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
