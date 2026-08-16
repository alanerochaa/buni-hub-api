import type { ResourceEnvironment } from './resource.model.js'

export interface HistorySnapshotCategoryCounts {
  total: number
  online: number
  offline: number
  maintenance: number
  unknown: number
  slow: number
}

export interface HistorySnapshot {
  timestamp: string
  total: number
  online: number
  offline: number
  maintenance: number
  unknown: number
  availabilityPercentage: number

  slow?: number
  averageResponseTimeMs?: number | null
  byEnvironment?: Record<ResourceEnvironment, HistorySnapshotCategoryCounts>
}

export interface HistoryRepository {
  append(snapshot: HistorySnapshot): void
  findAll(): HistorySnapshot[]
}
