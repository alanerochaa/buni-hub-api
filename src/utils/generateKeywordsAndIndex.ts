import { normalizeSearchTerm } from './normalizeSearchTerm.js'
import type { ResourceEnvironment, ResourceType } from '../models/resource.model.js'

const TYPE_LABELS: Record<ResourceType, string> = {
  api: 'API',
  'web-service': 'Web Service',
  site: 'Site',
}

const ENVIRONMENT_LABELS: Record<ResourceEnvironment, string> = {
  producao: 'Produção',
  homologacao: 'Homologação',
  desenvolvimento: 'Desenvolvimento',
  unknown: 'Desconhecido',
}

export interface KeywordSources {
  name: string
  description?: string
  keywords?: string[]
}

export function generateKeywords(source: KeywordSources): string[] {
  const tokens = new Set<string>()

  for (const word of source.name.split(/\s+/)) {
    const token = normalizeSearchTerm(word)
    if (token.length > 2) tokens.add(token)
  }

  for (const keyword of source.keywords ?? []) {
    const token = normalizeSearchTerm(keyword)
    if (token) tokens.add(token)
  }

  return [...tokens]
}

export interface SearchIndexSources {
  name: string
  technicalName: string
  code?: string
  url?: string
  description?: string
  keywords: string[]
  tags: string[]
  type: ResourceType
  environment: ResourceEnvironment
}

export function generateSearchIndex(source: SearchIndexSources): string[] {
  const values = [
    source.name,
    source.technicalName,
    source.code,
    source.url,
    source.description,
    ...source.keywords,
    ...source.tags,
    TYPE_LABELS[source.type],
    ENVIRONMENT_LABELS[source.environment],
  ].filter((value): value is string => Boolean(value))

  return [...new Set(values.map(normalizeSearchTerm))]
}
