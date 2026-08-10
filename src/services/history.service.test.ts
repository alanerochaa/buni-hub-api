import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import { ResourceRepository } from '../repositories/resource.repository.js'
import { JsonHistoryRepository } from '../repositories/history.repository.js'
import { JsonOperationalLogRepository } from '../repositories/operationalLog.repository.js'
import { OperationalLogService } from './operationalLog.service.js'
import { HistoryService } from './history.service.js'
import type { Resource } from '../models/resource.model.js'
import type { OperationalEvent } from '../models/operationalLog.model.js'

function setup(resources: Resource[]) {
  const dir = mkdtempSync(path.join(tmpdir(), 'buni-history-'))
  writeFileSync(path.join(dir, 'resources.json'), JSON.stringify(resources), 'utf-8')
  writeFileSync(path.join(dir, 'history.json'), '[]', 'utf-8')
  writeFileSync(path.join(dir, 'events.json'), '[]', 'utf-8')

  const resourceRepository = new ResourceRepository(path.join(dir, 'resources.json'))
  const historyRepository = new JsonHistoryRepository(path.join(dir, 'history.json'))
  const operationalLogRepository = new JsonOperationalLogRepository(path.join(dir, 'events.json'))
  const operationalLogService = new OperationalLogService(operationalLogRepository)
  const historyService = new HistoryService(
    historyRepository,
    operationalLogService,
    resourceRepository,
  )

  return { dir, operationalLogRepository, historyService }
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

function offlineEvent(overrides: Partial<OperationalEvent>): OperationalEvent {
  return {
    id: overrides.id ?? `evt-${Math.random()}`,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    resourceId: overrides.resourceId!,
    resourceName: overrides.resourceName ?? 'Recurso',
    resourceType: 'api',
    previousStatus: 'online',
    currentStatus: 'offline',
    reason: 'Falha de conexão',
    environment: 'homologacao',
    ...overrides,
  }
}

test('HistoryService.getMostUnstable conta transições para offline por recurso lógico (funde HML+PROD)', () => {
  const flakyHml = baseResource({ id: 'flaky-hml', code: 'FLK', environment: 'homologacao' })
  const flakyProd = baseResource({ id: 'flaky-prod', code: 'FLK', environment: 'producao' })
  const stable = baseResource({ id: 'stable-1', code: 'STB' })
  const { dir, operationalLogRepository, historyService } = setup([flakyHml, flakyProd, stable])

  try {
    const now = Date.now()
    const recent = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString()

    operationalLogRepository.append(
      offlineEvent({
        resourceId: 'flaky-hml',
        resourceName: 'API Instável',
        timestamp: recent(10),
      }),
    )
    operationalLogRepository.append(
      offlineEvent({
        resourceId: 'flaky-prod',
        resourceName: 'API Instável',
        timestamp: recent(5),
      }),
    )
    operationalLogRepository.append(
      offlineEvent({ resourceId: 'stable-1', resourceName: 'API Estável', timestamp: recent(3) }),
    )
    // Fora da janela de 24h — não deve entrar na contagem.
    operationalLogRepository.append(
      offlineEvent({
        resourceId: 'flaky-hml',
        resourceName: 'API Instável',
        timestamp: recent(60 * 30),
      }),
    )

    const since = new Date(now - 24 * 60 * 60_000).toISOString()
    const ranking = historyService.getMostUnstable(since, 5)

    const flaky = ranking.find((entry) => entry.name === 'API Instável')!
    assert.equal(
      flaky.value,
      2,
      'HML e PROD do mesmo recurso lógico somam no mesmo ranking, e o evento fora da janela não conta',
    )

    const stableEntry = ranking.find((entry) => entry.name === 'API Estável')!
    assert.equal(stableEntry.value, 1)

    assert.ok(
      ranking[0].value >= ranking[1].value,
      'ranking ordenado do mais instável para o menos',
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
