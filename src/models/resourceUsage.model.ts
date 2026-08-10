/**
 * Contagem de consumo real por recurso e por dia. Nada no sistema grava aqui hoje —
 * não existe gateway/proxy/instrumentação de tráfego real para as APIs monitoradas
 * (só o health check de disponibilidade, que NÃO é consumo real e nunca deve
 * alimentar isto). Este modelo só existe para que uma integração futura (gateway,
 * proxy reverso, ou os próprios sistemas consumidores) tenha um endpoint pronto para
 * reportar uso sem exigir mudança de arquitetura.
 */
export interface ResourceUsageRecord {
  resourceId: string
  /** Data no formato YYYY-MM-DD (fuso do servidor), um registro por recurso por dia. */
  date: string
  count: number
}

export interface ResourceUsageRepository {
  increment(resourceId: string, date: string): void
  findAll(): ResourceUsageRecord[]
}
