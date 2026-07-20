import { normalizeSearchTerm } from './normalizeSearchTerm.js'
import type { ResourceEnvironment, ResourceType } from '../models/resource.model.js'

export function slugify(value: string): string {
  return normalizeSearchTerm(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateResourceId(
  type: ResourceType,
  environment: ResourceEnvironment,
  technicalName: string,
): string {
  return `${type}-${environment}-${slugify(technicalName)}`
}
