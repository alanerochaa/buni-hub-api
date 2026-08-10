import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import { ResourceRepository } from '../repositories/resource.repository.js'
import { HealthRepository } from '../repositories/health.repository.js'
import { HealthCheckService } from './healthCheck.service.js'
import { DashboardService } from './dashboard.service.js'
import type { Resource } from '../models/resource.model.js'

const HEALTH_OPTIONS = { timeoutMs: 5000, slowThresholdMs: 1000, concurrency: 20 }

function setup(resources: Resource[]) {
  const dir = mkdtempSync(path.join(tmpdir(), 'buni-dashboard-'))
  const dataFilePath = path.join(dir, 'resources.json')
  writeFileSync(dataFilePath, JSON.stringify(resources), 'utf-8')

  const resourceRepository = new ResourceRepository(dataFilePath)
  const healthRepository = new HealthRepository()
  const healthCheckService = new HealthCheckService(
    resourceRepository,
    healthRepository,
    HEALTH_OPTIONS,
  )
  const dashboardService = new DashboardService(resourceRepository, healthCheckService)

  return { dir, healthRepository, healthCheckService, resourceRepository, dashboardService }
}

function baseResource(overrides: Partial<Resource>): Resource {
  return {
    id: overrides.id ?? 'r-1',
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

test('DashboardService.getSummary conta slow separadamente de online e calcula tempo médio de resposta', () => {
  const fast = baseResource({ id: 'fast-1', code: 'F1', url: 'https://x/fast' })
  const slow = baseResource({ id: 'slow-1', code: 'S1', url: 'https://x/slow' })
  const { dir, healthRepository, dashboardService } = setup([fast, slow])

  try {
    healthRepository.set({
      resourceId: 'fast-1',
      status: 'online',
      responseTime: 100,
      httpStatus: 200,
      lastCheckedAt: new Date().toISOString(),
    })
    healthRepository.set({
      resourceId: 'slow-1',
      status: 'slow',
      responseTime: 2000,
      httpStatus: 200,
      lastCheckedAt: new Date().toISOString(),
    })

    const summary = dashboardService.getSummary()

    assert.equal(summary.total, 2)
    assert.equal(summary.online, 2, "'slow' continua contando como 'online' no total agregado")
    assert.equal(summary.slow, 1, "mas também é contado separadamente em 'slow'")
    assert.equal(summary.averageResponseTimeMs, 1050)
    assert.equal(summary.monitoredPercentage, 100, 'os dois recursos têm URL cadastrada')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('DashboardService.getSlowestResources ordena pelo maior tempo de resposta atual', () => {
  const a = baseResource({ id: 'a-1', code: 'A1', url: 'https://x/a' })
  const b = baseResource({ id: 'b-1', code: 'B1', url: 'https://x/b' })
  const c = baseResource({ id: 'c-1', code: 'C1', url: 'https://x/c' })
  const { dir, healthRepository, dashboardService } = setup([a, b, c])

  try {
    healthRepository.set({
      resourceId: 'a-1',
      status: 'online',
      responseTime: 300,
      lastCheckedAt: new Date().toISOString(),
    })
    healthRepository.set({
      resourceId: 'b-1',
      status: 'slow',
      responseTime: 1800,
      lastCheckedAt: new Date().toISOString(),
    })
    healthRepository.set({
      resourceId: 'c-1',
      status: 'online',
      responseTime: 900,
      lastCheckedAt: new Date().toISOString(),
    })

    const ranking = dashboardService.getSlowestResources(2)

    assert.equal(ranking.length, 2)
    assert.equal(ranking[0].id, 'b-1')
    assert.equal(ranking[0].value, 1800)
    assert.equal(ranking[1].id, 'c-1')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// Regressão: getSummary/getIncidents/getSlowestResources compartilham o mesmo
// agrupamento cacheado (TTL curto, só em memória) em vez de recalcular a cada
// chamada — ver `GROUPS_CACHE_TTL_MS` em dashboard.service.ts.
test('DashboardService cacheia o agrupamento por um TTL curto, compartilhado entre getSummary/getIncidents/getSlowestResources', () => {
  const a = baseResource({ id: 'ca-1', code: 'CA1', url: 'https://x/a' })
  const { dir, healthRepository, healthCheckService, resourceRepository, dashboardService } = setup(
    [a],
  )

  try {
    healthRepository.set({
      resourceId: 'ca-1',
      status: 'online',
      responseTime: 100,
      lastCheckedAt: new Date().toISOString(),
    })

    const summaryBefore = dashboardService.getSummary()
    assert.equal(summaryBefore.offline, 0)

    // Estado muda em memória sem que o TTL do cache expire — getIncidents() logo em
    // seguida deve enxergar o MESMO agrupamento já calculado por getSummary(), não
    // recalcular do zero com o novo estado.
    healthRepository.set({
      resourceId: 'ca-1',
      status: 'offline',
      errorMessage: 'falha',
      lastCheckedAt: new Date().toISOString(),
    })
    const incidentsWithinTtl = dashboardService.getIncidents()
    assert.equal(
      incidentsWithinTtl.length,
      0,
      'dentro do TTL do cache, getIncidents() deve refletir o agrupamento cacheado (online), não o novo estado offline',
    )

    // Uma instância nova (cache próprio, vazio) sobre o mesmo repositório/health
    // enxerga o estado real imediatamente — prova que o cache é só uma otimização de
    // leitura por instância, não um atraso permanente na consistência dos dados.
    const freshService = new DashboardService(resourceRepository, healthCheckService)
    const freshIncidents = freshService.getIncidents()
    assert.equal(
      freshIncidents.length,
      1,
      'uma instância sem cache prévio reflete o status offline atual',
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
