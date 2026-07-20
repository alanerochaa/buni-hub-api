import type { Resource, ResourceHealth } from '../models/resource.model.js'
import type { DashboardResourceStatus } from '../types/dashboard.type.js'

export function resolveResourceStatus(
  resource: Resource,
  health: ResourceHealth | undefined,
): DashboardResourceStatus {
  if (!resource.active) return 'maintenance'

  const status = health?.status ?? 'unknown'
  if (status === 'online' || status === 'slow') return 'online'
  if (status === 'offline') return 'offline'
  return 'unknown'
}

export function calculateAvailabilityPercentage(online: number, total: number): number {
  if (total === 0) return 100
  return Math.round((online / total) * 10_000) / 100
}
