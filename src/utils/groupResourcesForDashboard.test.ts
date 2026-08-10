import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Resource, ResourceHealth } from '../models/resource.model.js'
import { groupResourcesForDashboard } from './groupResourcesForDashboard.js'

let nextId = 1
function makeResource(overrides: Partial<Resource>): Resource {
  const id = overrides.id ?? `res-${nextId++}`
  return {
    id,
    type: 'api',
    name: 'Recurso',
    technicalName: 'recurso',
    environment: 'homologacao',
    deprecated: false,
    active: true,
    keywords: [],
    tags: [],
    searchIndex: [],
    ...overrides,
  }
}

const NO_HEALTH = new Map<string, ResourceHealth>()
const NO_OFFLINE_SINCE = () => undefined

test('groupResourcesForDashboard agrupa HML+PROD do mesmo recurso em um único card', () => {
  const hml = makeResource({ id: 'd-hml', code: 'D1', environment: 'homologacao' })
  const prod = makeResource({ id: 'd-prod', code: 'D1', environment: 'producao' })

  const groups = groupResourcesForDashboard([hml, prod], NO_HEALTH, NO_OFFLINE_SINCE)

  assert.equal(groups.length, 1, 'HML e PROD do mesmo recurso devem virar um único card')
  assert.equal(groups[0].environments.length, 2)
})

// Regressão: espelha o mesmo fallback que web/groupResourcesByIdentity.ts já tinha —
// antes desta correção, o dashboard não fundia grupos via pairedResourceId, então um
// recurso cujo nome/código diverge entre HML e PROD aparecia como dois cards aqui
// mesmo já aparecendo corretamente como um só no catálogo.
test('groupResourcesForDashboard funde grupos via pairedResourceId quando nome/código divergem', () => {
  const hml = makeResource({
    id: 'r-hml',
    code: 'X1',
    name: 'Nome antigo',
    environment: 'homologacao',
    pairedResourceId: 'r-prod',
  })
  const prod = makeResource({
    id: 'r-prod',
    code: 'X1-renomeado',
    name: 'Nome novo',
    environment: 'producao',
    pairedResourceId: 'r-hml',
  })

  const groups = groupResourcesForDashboard([hml, prod], NO_HEALTH, NO_OFFLINE_SINCE)

  assert.equal(
    groups.length,
    1,
    'não deve duplicar o card quando o pareamento por nome/código falha mas pairedResourceId existe',
  )
  assert.equal(groups[0].environments.length, 2)
})

test('groupResourcesForDashboard não agrupa recursos de tipos ou identidades diferentes', () => {
  const a = makeResource({ id: 'a-1', code: 'A1' })
  const b = makeResource({ id: 'b-1', code: 'B1' })

  const groups = groupResourcesForDashboard([a, b], NO_HEALTH, NO_OFFLINE_SINCE)
  assert.equal(groups.length, 2)
})

// Regressão: o Painel Operacional (NOC) precisa distinguir 'slow' de 'online' e
// mostrar tempo de resposta / último erro por ambiente — antes desta mudança esses
// dados existiam em memória (ResourceHealth) mas não eram repassados para o grupo.
test('groupResourcesForDashboard repassa slow, responseTime, httpStatus e errorMessage do health check', () => {
  const slowResource = makeResource({ id: 'slow-1', code: 'S1' })
  const offlineResource = makeResource({ id: 'off-1', code: 'O1' })

  const health = new Map<string, ResourceHealth>([
    [
      'slow-1',
      {
        resourceId: 'slow-1',
        status: 'slow',
        responseTime: 1800,
        httpStatus: 200,
        lastCheckedAt: new Date().toISOString(),
      },
    ],
    [
      'off-1',
      {
        resourceId: 'off-1',
        status: 'offline',
        errorMessage: 'ECONNREFUSED',
        lastCheckedAt: new Date().toISOString(),
      },
    ],
  ])

  const groups = groupResourcesForDashboard(
    [slowResource, offlineResource],
    health,
    NO_OFFLINE_SINCE,
  )

  const slowGroup = groups.find((g) => g.id === 'slow-1')!
  assert.equal(slowGroup.environments[0].slow, true)
  assert.equal(slowGroup.environments[0].responseTime, 1800)
  assert.equal(slowGroup.environments[0].httpStatus, 200)
  assert.equal(
    slowGroup.environments[0].status,
    'online',
    "'slow' continua contando como 'online' no status agregado",
  )

  const offlineGroup = groups.find((g) => g.id === 'off-1')!
  assert.equal(offlineGroup.environments[0].slow, false)
  assert.equal(offlineGroup.environments[0].errorMessage, 'ECONNREFUSED')
})
