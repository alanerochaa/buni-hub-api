/**
 * Snapshot agregado do ambiente, gravado a cada sweep do Health Check
 * — alimenta gráficos de disponibilidade ao longo do tempo. Mesmo
 * formato de contagem do DashboardSummary, sem o detalhamento por tipo
 * (o histórico é do ambiente como um todo, não por categoria).
 */
export interface HistorySnapshot {
  timestamp: string
  total: number
  online: number
  offline: number
  maintenance: number
  unknown: number
  availabilityPercentage: number
}

/**
 * Porta de persistência do Histórico Operacional — a única forma pela
 * qual Service/Controller acessam os dados. A implementação atual
 * (`JsonHistoryRepository`) grava em `data/history.json`; uma futura
 * `PostgresHistoryRepository`/`MongoHistoryRepository` implementaria
 * esta mesma interface sem exigir mudança em HistoryService nem nos
 * endpoints.
 */
export interface HistoryRepository {
  append(snapshot: HistorySnapshot): void
  findAll(): HistorySnapshot[]
}
