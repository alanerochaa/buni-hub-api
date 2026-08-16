import type { Resource, ResourceHealth } from '../models/resource.model.js'
import type { DashboardResourceStatus } from '../types/dashboard.type.js'

export function resolveResourceStatus(
  resource: Resource,
  health: ResourceHealth | undefined,
): DashboardResourceStatus {
  if (!resource.active) return 'maintenance'

  const status = health?.status ?? 'unknown'
  if (status === 'online' || status === 'slow') return 'online'
  // 'unavailable' (4xx, ex.: 404) é uma falha confirmada do endpoint tanto quanto uma
  // falha de rede — o Painel Operacional não distingue os dois motivos, só se está
  // disponível ou não.
  if (status === 'offline' || status === 'unavailable') return 'offline'
  return 'unknown'
}

export function calculateAvailabilityPercentage(online: number, total: number): number {
  if (total === 0) return 100
  return Math.round((online / total) * 10_000) / 100
}

/** Um recurso ativo cujo check mais recente veio classificado como 'slow' — subconjunto de 'online'. */
export function isSlowResource(resource: Resource, health: ResourceHealth | undefined): boolean {
  return resource.active && health?.status === 'slow'
}

/** Média (ms, arredondada) dos tempos de resposta disponíveis — `null` se nenhum estiver definido. */
export function averageResponseTime(healths: Array<ResourceHealth | undefined>): number | null {
  const times = healths
    .map((health) => health?.responseTime)
    .filter((value): value is number => typeof value === 'number')
  if (times.length === 0) return null
  return Math.round(times.reduce((sum, value) => sum + value, 0) / times.length)
}
