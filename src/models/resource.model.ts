export type ResourceType = 'api' | 'web-service' | 'site'
export type ResourceEnvironment = 'homologacao' | 'producao' | 'unknown'

export interface Resource {
  id: string
  type: ResourceType

  displayName?: string
  name: string
  technicalName: string
  code?: string
  url?: string

  environment: ResourceEnvironment
  /** id do registro do mesmo recurso lógico no outro ambiente (HML<->PROD), preenchido na promoção */
  pairedResourceId?: string
  category?: string
  deprecated: boolean
  active: boolean

  description?: string
  keywords: string[]
  tags: string[]

  searchIndex: string[]

  docUrl?: string
  responsible?: string
  area?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type ResourceStatus = 'online' | 'slow' | 'offline' | 'unknown'

export interface ResourceHealth {
  resourceId: string
  status: ResourceStatus
  httpStatus?: number
  responseTime?: number
  lastCheckedAt: string
  errorMessage?: string
}
