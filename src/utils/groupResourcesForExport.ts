import type { Resource, ResourceEnvironment } from '../models/resource.model.js'
import { getResourceIdentityKey } from './resourceIdentity.js'

export interface ResourceExportGroup {
  /** Usado para Código, Nome, Tipo, Responsável e Status da linha consolidada. */
  representative: Resource
  homologacao?: Resource
  producao?: Resource
}

const ENVIRONMENT_PRIORITY: ResourceEnvironment[] = ['producao', 'homologacao', 'unknown']

function pickRepresentative(entries: Resource[]): Resource {
  for (const environment of ENVIRONMENT_PRIORITY) {
    const match = entries.find((entry) => entry.environment === environment)
    if (match) return match
  }
  return entries[0]
}

/**
 * Agrupa HML + PROD do mesmo recurso lógico numa única entrada — mesmo algoritmo
 * (chave de identidade + fusão por `pairedResourceId`) já usado por
 * `groupResourcesForDashboard.ts` para o Painel Operacional, replicado aqui porque a
 * saída é bem diferente (uma linha de Excel, não status de saúde). A REGRA de "o que
 * é o mesmo recurso lógico" é a mesma em todo o projeto: identidade por
 * type+code/nome, com `pairedResourceId` resolvendo os casos em que nome ou código
 * divergem entre os dois ambientes.
 */
export function groupResourcesForExport(resources: Resource[]): ResourceExportGroup[] {
  const byId = new Map(resources.map((resource) => [resource.id, resource]))
  const keyByResourceId = new Map<string, string>()
  const entriesByKey = new Map<string, Resource[]>()
  for (const resource of resources) {
    const key = getResourceIdentityKey(resource)
    keyByResourceId.set(resource.id, key)
    const entries = entriesByKey.get(key)
    if (entries) entries.push(resource)
    else entriesByKey.set(key, [resource])
  }

  const redirect = new Map<string, string>()
  function resolveKey(key: string): string {
    let current = key
    while (redirect.has(current)) current = redirect.get(current)!
    return current
  }

  for (const resource of resources) {
    if (!resource.pairedResourceId) continue
    const paired = byId.get(resource.pairedResourceId)
    if (!paired) continue

    const keyA = resolveKey(keyByResourceId.get(resource.id)!)
    const keyB = resolveKey(keyByResourceId.get(paired.id)!)
    if (keyA === keyB) continue

    const entriesA = entriesByKey.get(keyA)!
    const entriesB = entriesByKey.get(keyB)
    if (!entriesB) continue

    entriesByKey.set(keyA, [...entriesA, ...entriesB])
    entriesByKey.delete(keyB)
    redirect.set(keyB, keyA)
  }

  return Array.from(entriesByKey.values()).map((entries) => ({
    representative: pickRepresentative(entries),
    homologacao: entries.find((entry) => entry.environment === 'homologacao'),
    producao: entries.find((entry) => entry.environment === 'producao'),
  }))
}
