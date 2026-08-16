import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import type { Resource } from '../models/resource.model.js'

const { ResourceRepository } = await import('./resource.repository.js')

function buildResource(overrides: Partial<Resource> & Pick<Resource, 'id' | 'name'>): Resource {
  return {
    type: 'api',
    technicalName: overrides.name,
    environment: 'homologacao',
    deprecated: false,
    active: true,
    keywords: [],
    tags: [],
    searchIndex: [],
    ...overrides,
  }
}

function setupRepository(seed: Resource[]) {
  const dir = mkdtempSync(path.join(tmpdir(), 'buni-resource-repo-'))
  const dataFilePath = path.join(dir, 'resources.json')
  writeFileSync(dataFilePath, JSON.stringify(seed), 'utf-8')
  return { dataFilePath, dir }
}

test('updateMany aplica patches em mais de um registro sob uma única escrita', () => {
  const seed = [buildResource({ id: 'a', name: 'A' }), buildResource({ id: 'b', name: 'B' })]
  const { dataFilePath, dir } = setupRepository(seed)
  try {
    const repo = new ResourceRepository(dataFilePath)

    const updated = repo.updateMany([
      { id: 'a', patch: { name: 'A renomeado' } },
      { id: 'b', patch: { name: 'B renomeado' } },
    ])

    assert.equal(updated.length, 2)
    assert.equal(updated[0].name, 'A renomeado')
    assert.equal(updated[1].name, 'B renomeado')

    const onDisk = JSON.parse(readFileSync(dataFilePath, 'utf-8')) as Resource[]
    assert.equal(onDisk.find((r) => r.id === 'a')!.name, 'A renomeado')
    assert.equal(onDisk.find((r) => r.id === 'b')!.name, 'B renomeado')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('updateMany com removeFields remove a chave de verdade do JSON persistido (não fica como "displayName":null nem sobrevive)', () => {
  const seed = [buildResource({ id: 'a', name: 'A', displayName: 'Nome Bonito Legado' })]
  const { dataFilePath, dir } = setupRepository(seed)
  try {
    const repo = new ResourceRepository(dataFilePath)

    repo.updateMany([{ id: 'a', patch: { name: 'A' }, removeFields: ['displayName'] }])

    const rawText = readFileSync(dataFilePath, 'utf-8')
    assert.ok(
      !rawText.includes('displayName'),
      'a chave "displayName" não deve aparecer no arquivo em disco',
    )

    const onDisk = JSON.parse(rawText) as Resource[]
    assert.equal('displayName' in onDisk[0], false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('updateMany ignora silenciosamente ids inexistentes, sem afetar os demais patches', () => {
  const seed = [buildResource({ id: 'a', name: 'A' })]
  const { dataFilePath, dir } = setupRepository(seed)
  try {
    const repo = new ResourceRepository(dataFilePath)

    const updated = repo.updateMany([
      { id: 'a', patch: { name: 'A renomeado' } },
      { id: 'id-que-nao-existe', patch: { name: 'nunca aplicado' } },
    ])

    assert.equal(updated.length, 1)
    assert.equal(updated[0].id, 'a')

    const onDisk = JSON.parse(readFileSync(dataFilePath, 'utf-8')) as Resource[]
    assert.equal(
      onDisk.length,
      1,
      'nenhum registro novo deve ter sido criado para o id inexistente',
    )
    assert.equal(onDisk[0].name, 'A renomeado')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('updateMany preserva o id original mesmo que o patch tente sobrescrevê-lo', () => {
  const seed = [buildResource({ id: 'a', name: 'A' })]
  const { dataFilePath, dir } = setupRepository(seed)
  try {
    const repo = new ResourceRepository(dataFilePath)

    const [updated] = repo.updateMany([
      { id: 'a', patch: { id: 'outro-id', name: 'A renomeado' } as Partial<Resource> },
    ])

    assert.equal(updated.id, 'a')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('valor gravado por updateMany sobrevive a uma nova instância do repositório (simula restart)', () => {
  const seed = [buildResource({ id: 'a', name: 'A' })]
  const { dataFilePath, dir } = setupRepository(seed)
  try {
    const repo = new ResourceRepository(dataFilePath)
    repo.updateMany([{ id: 'a', patch: { name: 'A renomeado' } }])

    const freshRepo = new ResourceRepository(dataFilePath)
    const reloaded = freshRepo.findById('a')
    assert.equal(reloaded?.name, 'A renomeado')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
