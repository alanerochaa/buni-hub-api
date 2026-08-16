import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import type { Resource } from '../models/resource.model.js'
import { HealthRepository } from '../repositories/health.repository.js'
import { ResourceRepository } from '../repositories/resource.repository.js'
import { HealthCheckService } from './healthCheck.service.js'

const HEALTH_OPTIONS = { timeoutMs: 1000, slowThresholdMs: 200, concurrency: 5 }

function setup(resources: Resource[]) {
  const dir = mkdtempSync(path.join(tmpdir(), 'buni-healthcheck-'))
  const dataFilePath = path.join(dir, 'resources.json')
  writeFileSync(dataFilePath, JSON.stringify(resources), 'utf-8')

  const resourceRepository = new ResourceRepository(dataFilePath)
  const healthRepository = new HealthRepository()
  const service = new HealthCheckService(resourceRepository, healthRepository, HEALTH_OPTIONS)

  return { dir, healthRepository, service }
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

function startServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server: Server = createServer(handler)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((closeResolve) => server.close(() => closeResolve())),
      })
    })
  })
}

test('classifica 200 rápido como online', async () => {
  const { url, close } = await startServer((_req, res) => res.writeHead(200).end('ok'))
  const { dir, healthRepository, service } = setup([baseResource({ id: 'ok-1', url })])
  try {
    await service.runSweep()

    const health = healthRepository.getById('ok-1')!
    assert.equal(health.status, 'online')
    assert.equal(health.httpStatus, 200)
  } finally {
    await close()
    rmSync(dir, { recursive: true, force: true })
  }
})

test('classifica 200 lento (acima do slowThresholdMs) como slow', async () => {
  const { url, close } = await startServer((_req, res) => {
    setTimeout(() => res.writeHead(200).end('ok'), HEALTH_OPTIONS.slowThresholdMs + 100)
  })
  const { dir, healthRepository, service } = setup([baseResource({ id: 'slow-1', url })])
  try {
    await service.runSweep()

    assert.equal(healthRepository.getById('slow-1')!.status, 'slow')
  } finally {
    await close()
    rmSync(dir, { recursive: true, force: true })
  }
})

test('classifica HTTP 404 como unavailable, não como unknown — servidor respondeu, endpoint não existe', async () => {
  const { url, close } = await startServer((_req, res) => res.writeHead(404).end('not found'))
  const { dir, healthRepository, service } = setup([baseResource({ id: 'notfound-1', url })])
  try {
    await service.runSweep()

    const health = healthRepository.getById('notfound-1')!
    assert.equal(health.status, 'unavailable')
    assert.equal(health.httpStatus, 404)
  } finally {
    await close()
    rmSync(dir, { recursive: true, force: true })
  }
})

test('classifica outros 4xx (ex.: 403) também como unavailable', async () => {
  const { url, close } = await startServer((_req, res) => res.writeHead(403).end('forbidden'))
  const { dir, healthRepository, service } = setup([baseResource({ id: 'forbidden-1', url })])
  try {
    await service.runSweep()

    assert.equal(healthRepository.getById('forbidden-1')!.status, 'unavailable')
  } finally {
    await close()
    rmSync(dir, { recursive: true, force: true })
  }
})

test('classifica HTTP 500 como offline', async () => {
  const { url, close } = await startServer((_req, res) => res.writeHead(500).end('boom'))
  const { dir, healthRepository, service } = setup([baseResource({ id: 'error-1', url })])
  try {
    await service.runSweep()

    assert.equal(healthRepository.getById('error-1')!.status, 'offline')
  } finally {
    await close()
    rmSync(dir, { recursive: true, force: true })
  }
})

test('classifica timeout como offline', async () => {
  const { url, close } = await startServer((_req, res) => {
    setTimeout(() => res.writeHead(200).end('ok'), HEALTH_OPTIONS.timeoutMs + 500)
  })
  const { dir, healthRepository, service } = setup([baseResource({ id: 'timeout-1', url })])
  try {
    await service.runSweep()

    const health = healthRepository.getById('timeout-1')!
    assert.equal(health.status, 'offline')
    assert.match(health.errorMessage ?? '', /Tempo limite excedido/)
  } finally {
    await close()
    rmSync(dir, { recursive: true, force: true })
  }
})

test('recurso sem URL fica como unknown (não verificado), sem tentar rede', async () => {
  const { dir, healthRepository, service } = setup([
    baseResource({ id: 'no-url-1', url: undefined }),
  ])
  try {
    await service.runSweep()

    assert.equal(healthRepository.getById('no-url-1')!.status, 'unknown')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
