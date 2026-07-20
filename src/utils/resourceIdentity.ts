import { normalizeSearchTerm } from './normalizeSearchTerm.js'
import type { Resource } from '../models/resource.model.js'

export function getResourceIdentityKey(resource: Resource): string {
  const code = resource.code?.trim()
  const identity = code || normalizeSearchTerm(resource.name)
  return `${resource.type}:${identity}`
}
