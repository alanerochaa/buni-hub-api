import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

process.env.JWT_SECRET = 'a'.repeat(32)
process.env.NODE_ENV ??= 'test'

const { ResourceRepository } = await import('../repositories/resource.repository.js')
const { JsonResourceUsageRepository } = await import('../repositories/resourceUsage.repository.js')
const { ResourceService } = await import('./resource.service.js')
const { ResourcePromotionService } = await import('./resourcePromotion.service.js')

function setupRepository() {
  const dir = mkdtempSync(path.join(tmpdir(), 'buni-resources-'))
  const dataFilePath = path.join(dir, 'resources.json')
  writeFileSync(dataFilePath, '[]', 'utf-8')
  const usageRepository = new JsonResourceUsageRepository(path.join(dir, 'resourceUsage.json'))
  return { repository: new ResourceRepository(dataFilePath), usageRepository, dir }
}

test('promoção grava pairedResourceId nos dois lados (HML e Produção)', () => {
  const { repository, usageRepository, dir } = setupRepository()
  try {
    const resourceService = new ResourceService(repository, usageRepository)
    const promotionService = new ResourcePromotionService(repository, resourceService)

    const source = resourceService.createResource({
      name: 'Inclusão de Cliente',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/FIApi/incluir-cliente',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })

    const report = promotionService.promoteHomologacaoToProducao()

    assert.equal(report.success, true)
    assert.equal(report.created, 1)

    const target = repository.findById(report.items[0].targetId!)!
    const updatedSource = repository.findById(source.id)!

    assert.equal(target.environment, 'producao')
    assert.equal(target.pairedResourceId, source.id)
    assert.equal(updatedSource.pairedResourceId, target.id)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('promoção repetida não duplica: recurso já promovido é apenas ignorado (skipped)', () => {
  const { repository, usageRepository, dir } = setupRepository()
  try {
    const resourceService = new ResourceService(repository, usageRepository)
    const promotionService = new ResourcePromotionService(repository, resourceService)

    resourceService.createResource({
      name: 'Consultar Agências',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/FIApi/agencias',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })

    promotionService.promoteHomologacaoToProducao()
    const secondReport = promotionService.promoteHomologacaoToProducao()

    assert.equal(secondReport.created, 0)
    assert.equal(secondReport.skipped, 1)
    assert.equal(
      repository.findAll().length,
      2,
      'não deve criar um terceiro registro para o mesmo recurso',
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
