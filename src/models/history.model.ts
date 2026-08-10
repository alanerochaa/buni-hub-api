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
  /**
   * Campos opcionais — só existem em snapshots gravados a partir da introdução do
   * Painel Operacional (NOC). Snapshots antigos em history.json não os têm; quem lê
   * precisa tratar a ausência como "sem dado ainda", nunca como zero.
   */
  slow?: number
  averageResponseTimeMs?: number | null
  byEnvironment?: Record<ResourceEnvironment, HistorySnapshotCategoryCounts>
}

export interface HistoryRepository {
  append(snapshot: HistorySnapshot): void
  findAll(): HistorySnapshot[]
}
