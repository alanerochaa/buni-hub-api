export interface HistorySnapshot {
  timestamp: string
  total: number
  online: number
  offline: number
  maintenance: number
  unknown: number
  availabilityPercentage: number
}

export interface HistoryRepository {
  append(snapshot: HistorySnapshot): void
  findAll(): HistorySnapshot[]
}
