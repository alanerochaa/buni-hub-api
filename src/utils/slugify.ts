import { normalizeSearchTerm } from './normalizeSearchTerm.js'
import type { ResourceType } from '../models/resource.model.js'

/**
 * Gera um slug estável a partir de um texto livre (nome digitado no
 * formulário de cadastro), reaproveitando a mesma normalização usada
 * na busca (minúsculo, sem acento).
 */
export function slugify(value: string): string {
  return normalizeSearchTerm(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Segue o mesmo padrão de id usado pelos registros importados pela
 * Ingestion: `${type}-${slug(technicalName)}`.
 */
export function generateResourceId(type: ResourceType, technicalName: string): string {
  return `${type}-${slugify(technicalName)}`
}
