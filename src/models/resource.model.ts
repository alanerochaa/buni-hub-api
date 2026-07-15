/**
 * Espelha exatamente ingestion/src/types.ts. resources.json é gerado
 * por ingestion/ seguindo este mesmo formato — qualquer mudança deve
 * ser replicada nos três lugares (ingestion/, web/, api/), já que são
 * projetos Node independentes.
 */

export type ResourceType = 'api' | 'web-service' | 'site'
export type ResourceEnvironment = 'homologacao' | 'producao' | 'desenvolvimento' | 'unknown'

export interface Resource {
  id: string
  type: ResourceType

  // Quando presente, é o nome principal exibido ao usuário, com
  // prioridade sobre `name`. `name`/`technicalName` continuam
  // existindo (uso interno) mesmo quando displayName é omitido.
  displayName?: string
  name: string
  technicalName: string
  code?: string
  url?: string

  environment: ResourceEnvironment
  category?: string
  deprecated: boolean
  active: boolean

  description?: string
  keywords: string[]
  tags: string[]

  searchIndex: string[]

  // Módulo administrativo (cadastro manual pela interface, sem
  // Ingestion): metadados opcionais, ausentes nos registros importados
  // em lote.
  docUrl?: string
  responsible?: string
  area?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

// 'slow': resposta válida, porém acima do limite de tempo configurado.
export type ResourceStatus = 'online' | 'slow' | 'offline' | 'unknown'

export interface ResourceHealth {
  resourceId: string
  status: ResourceStatus
  httpStatus?: number
  responseTime?: number
  lastCheckedAt: string
}
