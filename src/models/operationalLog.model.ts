import type { ResourceEnvironment, ResourceType } from './resource.model.js'
import type { DashboardResourceStatus } from '../types/dashboard.type.js'

/**
 * Modelo do **Log Operacional** — o outro pilar do módulo de auditoria,
 * ao lado do **Histórico Operacional** (`history.model.ts`):
 *
 * - Histórico Operacional (`history.json`) → métricas agregadas e série
 *   temporal (um `HistorySnapshot` por sweep, sempre).
 * - Log Operacional (`events.json`) → eventos detalhados e auditoria
 *   (um `OperationalEvent` só quando o status de um recurso muda de
 *   verdade — ver OperationalLogService).
 */

// Hoje só existe a varredura periódica automática (ver server.ts); o
// tipo já é uma união para uma futura checagem manual (ex.: botão
// "verificar agora" no Cadastro de Recursos) não exigir migração do
// formato do evento.
export type OperationalLogOrigin = 'scheduled-sweep' | 'manual'

/**
 * Um registro do Log Operacional: uma mudança real de status de um
 * recurso — nunca uma repetição do mesmo status entre sweeps
 * consecutivos (ver OperationalLogService). Só usa dados já produzidos
 * pelo Health Check (`httpStatus`/`responseTime`/`errorMessage`);
 * nenhuma chamada adicional é feita para gerar um evento.
 *
 * Campos além dos originais (`environment` em diante) são opcionais na
 * leitura para manter compatibilidade com eventos já persistidos em
 * `events.json` antes desta evolução — todo evento novo os preenche.
 */
export interface OperationalEvent {
  id: string
  timestamp: string
  resourceId: string
  resourceName: string
  resourceType: ResourceType
  previousStatus: DashboardResourceStatus
  currentStatus: DashboardResourceStatus
  reason: string
  responseTime?: number
  httpStatus?: number

  environment?: ResourceEnvironment
  /** URL verificada no momento do evento — preserva o dado mesmo se o cadastro do recurso mudar depois. */
  resourceUrl?: string
  /** Mensagem real da exceção de rede, quando a falha não teve resposta HTTP (ver ResourceHealth.errorMessage). */
  errorMessage?: string
  /** Só presente em eventos de recuperação (saindo de 'offline'): há quanto tempo o recurso estava indisponível. */
  unavailabilityDurationMs?: number
  origin?: OperationalLogOrigin
}

/** Critérios de consulta do Log Operacional — ver `GET /dashboard/events`. */
export interface OperationalLogFilters {
  resourceId?: string
  status?: DashboardResourceStatus
  environment?: ResourceEnvironment
  /** ISO 8601 — eventos com timestamp >= since. */
  since?: string
  /** ISO 8601 — eventos com timestamp <= until. */
  until?: string
}

/**
 * Porta de persistência do Log Operacional — mesma lógica de
 * `HistoryRepository` (troca de implementação sem tocar em
 * Service/Controller). A filtragem é responsabilidade do Service, não
 * do Repository: `findAll()` continua devolvendo tudo, sem conhecer
 * `OperationalLogFilters`.
 */
export interface OperationalLogRepository {
  append(event: OperationalEvent): void
  findAll(): OperationalEvent[]
}
