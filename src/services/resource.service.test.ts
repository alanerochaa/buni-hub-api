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

function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), 'buni-resource-service-'))
  const dataFilePath = path.join(dir, 'resources.json')
  writeFileSync(dataFilePath, '[]', 'utf-8')
  const repository = new ResourceRepository(dataFilePath)
  const usageRepository = new JsonResourceUsageRepository(path.join(dir, 'resourceUsage.json'))
  const service = new ResourceService(repository, usageRepository)
  return { service, repository, dataFilePath, dir }
}

/** Cria um par HML/PROD já ligado por pairedResourceId, como uma promoção deixaria. */
function createPair(
  service: InstanceType<typeof ResourceService>,
  repository: InstanceType<typeof ResourceRepository>,
  overrides: { name: string; displayNameHml?: string; displayNameProd?: string },
) {
  const hml = service.createResource({
    name: overrides.name,
    type: 'api',
    url: 'https://buncghml.funcao.digital/API/exemplo',
    environment: 'homologacao',
    active: true,
    keywords: [],
    tags: [],
  })
  const prod = service.createResource({
    name: overrides.name,
    type: 'api',
    url: 'https://credito.buni.digital/API/exemplo',
    environment: 'producao',
    active: true,
    responsible: 'Time Produção',
    keywords: [],
    tags: [],
  })

  repository.update(hml.id, {
    pairedResourceId: prod.id,
    ...(overrides.displayNameHml ? { displayName: overrides.displayNameHml } : {}),
  })
  repository.update(prod.id, {
    pairedResourceId: hml.id,
    ...(overrides.displayNameProd ? { displayName: overrides.displayNameProd } : {}),
  })

  return {
    hml: repository.findById(hml.id)!,
    prod: repository.findById(prod.id)!,
  }
}

test('1) rename do lado HML com par propaga o novo name para o PROD', () => {
  const { service, repository, dir } = setup()
  try {
    const { hml, prod } = createPair(service, repository, { name: 'Nome Original' })

    service.updateResource(hml.id, { name: 'Nome Renomeado via HML' })

    const updatedHml = repository.findById(hml.id)!
    const updatedProd = repository.findById(prod.id)!
    assert.equal(updatedHml.name, 'Nome Renomeado via HML')
    assert.equal(updatedProd.name, 'Nome Renomeado via HML')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('2) rename do lado PROD com par propaga o novo name para o HML', () => {
  const { service, repository, dir } = setup()
  try {
    const { hml, prod } = createPair(service, repository, { name: 'Nome Original' })

    service.updateResource(prod.id, { name: 'Nome Renomeado via PROD' })

    const updatedHml = repository.findById(hml.id)!
    const updatedProd = repository.findById(prod.id)!
    assert.equal(updatedProd.name, 'Nome Renomeado via PROD')
    assert.equal(updatedHml.name, 'Nome Renomeado via PROD')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('3) displayName legado é removido dos dois lados quando name é efetivamente alterado', () => {
  const { service, repository, dir } = setup()
  try {
    const { hml, prod } = createPair(service, repository, {
      name: 'Nome Original',
      displayNameHml: 'Nome Bonito HML (legado)',
      displayNameProd: 'Nome Bonito PROD (legado)',
    })
    assert.equal(repository.findById(hml.id)!.displayName, 'Nome Bonito HML (legado)')
    assert.equal(repository.findById(prod.id)!.displayName, 'Nome Bonito PROD (legado)')

    service.updateResource(hml.id, { name: 'Nome Renomeado' })

    const updatedHml = repository.findById(hml.id)!
    const updatedProd = repository.findById(prod.id)!
    assert.equal(
      'displayName' in updatedHml,
      false,
      'displayName deve ser removido do lado editado',
    )
    assert.equal('displayName' in updatedProd, false, 'displayName deve ser removido do par')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('4) technicalName permanece exatamente igual ao anterior após o rename', () => {
  const { service, repository, dir } = setup()
  try {
    const { hml, prod } = createPair(service, repository, { name: 'FIApiExemploOriginal' })
    const technicalNameHmlBefore = repository.findById(hml.id)!.technicalName
    const technicalNameProdBefore = repository.findById(prod.id)!.technicalName

    service.updateResource(hml.id, { name: 'Nome Completamente Diferente' })

    assert.equal(repository.findById(hml.id)!.technicalName, technicalNameHmlBefore)
    assert.equal(repository.findById(prod.id)!.technicalName, technicalNameProdBefore)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('5) id permanece exatamente igual ao anterior após o rename, nos dois lados', () => {
  const { service, repository, dir } = setup()
  try {
    const { hml, prod } = createPair(service, repository, { name: 'Nome Original' })
    const hmlId = hml.id
    const prodId = prod.id

    service.updateResource(hml.id, { name: 'Nome Renomeado' })

    assert.equal(repository.findById(hmlId)!.id, hmlId)
    assert.equal(repository.findById(prodId)!.id, prodId)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('6) URL e demais campos específicos de ambiente permanecem intactos nos dois lados', () => {
  const { service, repository, dir } = setup()
  try {
    const { hml, prod } = createPair(service, repository, { name: 'Nome Original' })
    const urlHmlBefore = repository.findById(hml.id)!.url
    const urlProdBefore = repository.findById(prod.id)!.url
    const responsibleProdBefore = repository.findById(prod.id)!.responsible
    const activeProdBefore = repository.findById(prod.id)!.active
    const environmentProdBefore = repository.findById(prod.id)!.environment

    service.updateResource(hml.id, { name: 'Nome Renomeado' })

    assert.equal(repository.findById(hml.id)!.url, urlHmlBefore)
    assert.equal(repository.findById(prod.id)!.url, urlProdBefore)
    assert.equal(repository.findById(prod.id)!.responsible, responsibleProdBefore)
    assert.equal(repository.findById(prod.id)!.active, activeProdBefore)
    assert.equal(repository.findById(prod.id)!.environment, environmentProdBefore)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('7) alterar um campo diferente de name não propaga nada para o par', () => {
  const { service, repository, dir } = setup()
  try {
    const { hml, prod } = createPair(service, repository, { name: 'Nome Original' })
    const prodBefore = repository.findById(prod.id)!

    service.updateResource(hml.id, { responsible: 'Novo Responsável HML', active: false })

    const prodAfter = repository.findById(prod.id)!
    assert.equal(prodAfter.name, prodBefore.name)
    assert.equal(prodAfter.responsible, prodBefore.responsible)
    assert.equal(prodAfter.active, prodBefore.active)
    assert.equal(
      prodAfter.updatedAt,
      prodBefore.updatedAt,
      'par não deve nem ter sido tocado (updatedAt igual)',
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('8) enviar o mesmo name atual (sem mudança real) não atualiza o par', () => {
  const { service, repository, dir } = setup()
  try {
    const { hml, prod } = createPair(service, repository, { name: 'Nome Original' })
    const prodBefore = repository.findById(prod.id)!

    service.updateResource(hml.id, { name: 'Nome Original' })

    const prodAfter = repository.findById(prod.id)!
    assert.equal(
      prodAfter.updatedAt,
      prodBefore.updatedAt,
      'par não deve ser escrito quando name não muda de verdade',
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('9) recurso sem pairedResourceId continua sendo editado normalmente', () => {
  const { service, repository, dir } = setup()
  try {
    const solo = service.createResource({
      name: 'Recurso Sem Par',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/solo',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })

    const updated = service.updateResource(solo.id, { name: 'Recurso Sem Par Renomeado' })

    assert.equal(updated.name, 'Recurso Sem Par Renomeado')
    assert.equal(repository.findById(solo.id)!.name, 'Recurso Sem Par Renomeado')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('10) pairedResourceId apontando para um id inexistente não corrompe nem bloqueia a edição do recurso válido', () => {
  const { service, repository, dir } = setup()
  try {
    const resource = service.createResource({
      name: 'Recurso Com Par Pendurado',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/pendurado',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })
    repository.update(resource.id, { pairedResourceId: 'id-que-nunca-existiu' })

    const updated = service.updateResource(resource.id, { name: 'Renomeado Mesmo Assim' })

    assert.equal(updated.name, 'Renomeado Mesmo Assim')
    assert.equal(repository.findById(resource.id)!.name, 'Renomeado Mesmo Assim')
    assert.equal(repository.findById(resource.id)!.pairedResourceId, 'id-que-nunca-existiu')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('11) após restart (nova instância do repositório sobre o mesmo arquivo), os dois registros continuam consistentes', () => {
  const { service, repository, dataFilePath, dir } = setup()
  try {
    const { hml, prod } = createPair(service, repository, { name: 'Nome Original' })
    service.updateResource(hml.id, { name: 'Nome Pós-Restart' })

    const freshRepository = new ResourceRepository(dataFilePath)
    assert.equal(freshRepository.findById(hml.id)!.name, 'Nome Pós-Restart')
    assert.equal(freshRepository.findById(prod.id)!.name, 'Nome Pós-Restart')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
