import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupResourcesForExport } from './groupResourcesForExport.js'
import type { Resource } from '../models/resource.model.js'

function buildResource(
  overrides: Partial<Resource> & Pick<Resource, 'id' | 'name' | 'environment'>,
): Resource {
  return {
    type: 'api',
    technicalName: overrides.name,
    deprecated: false,
    active: true,
    keywords: [],
    tags: [],
    searchIndex: [],
    ...overrides,
  }
}

test('consolida HML + PROD do mesmo recurso lógico em um único grupo', () => {
  const hml = buildResource({
    id: 'api-homologacao-x',
    name: 'API X',
    environment: 'homologacao',
    url: 'https://hml.exemplo.com/x',
    pairedResourceId: 'api-producao-x',
  })
  const prod = buildResource({
    id: 'api-producao-x',
    name: 'API X',
    environment: 'producao',
    url: 'https://prod.exemplo.com/x',
    pairedResourceId: 'api-homologacao-x',
  })

  const groups = groupResourcesForExport([hml, prod])

  assert.equal(groups.length, 1, 'HML e PROD devem virar 1 único grupo, não 2')
  assert.equal(groups[0].homologacao?.url, 'https://hml.exemplo.com/x')
  assert.equal(groups[0].producao?.url, 'https://prod.exemplo.com/x')
})

test('recurso só com HML: URL PROD fica ausente, nada é perdido', () => {
  const hml = buildResource({
    id: 'api-homologacao-y',
    name: 'API Y',
    environment: 'homologacao',
    url: 'https://hml.exemplo.com/y',
  })

  const groups = groupResourcesForExport([hml])

  assert.equal(groups.length, 1)
  assert.equal(groups[0].homologacao?.url, 'https://hml.exemplo.com/y')
  assert.equal(groups[0].producao, undefined)
})

test('recurso só com PROD: URL HML fica ausente, nada é perdido', () => {
  const prod = buildResource({
    id: 'api-producao-z',
    name: 'API Z',
    environment: 'producao',
    url: 'https://prod.exemplo.com/z',
  })

  const groups = groupResourcesForExport([prod])

  assert.equal(groups.length, 1)
  assert.equal(groups[0].producao?.url, 'https://prod.exemplo.com/z')
  assert.equal(groups[0].homologacao, undefined)
})

test('fusão por pairedResourceId funciona mesmo quando nome/código divergem entre os ambientes (mesmo caso do groupResourcesForDashboard)', () => {
  const hml = buildResource({
    id: 'api-homologacao-w',
    name: 'FiApiAcrPropostaAcordo',
    code: 'FIAPICADACR',
    environment: 'homologacao',
    pairedResourceId: 'api-producao-w',
  })
  const prod = buildResource({
    id: 'api-producao-w',
    name: 'Web Api Proposta Acordo', // nome diverge do HML
    code: 'FIAPICADACR',
    environment: 'producao',
    pairedResourceId: 'api-homologacao-w',
  })

  const groups = groupResourcesForExport([hml, prod])

  assert.equal(
    groups.length,
    1,
    'mesmo com nomes divergentes, pairedResourceId deve fundir em 1 grupo',
  )
})

test('nenhum recurso é perdido nem duplicado num catálogo maior e heterogêneo', () => {
  const resources: Resource[] = [
    buildResource({
      id: 'a-hml',
      name: 'A',
      environment: 'homologacao',
      pairedResourceId: 'a-prod',
    }),
    buildResource({ id: 'a-prod', name: 'A', environment: 'producao', pairedResourceId: 'a-hml' }),
    buildResource({ id: 'b-hml', name: 'B', environment: 'homologacao' }), // órfão, sem par
    buildResource({ id: 'c-prod', name: 'C', environment: 'producao' }), // órfão, sem par
  ]

  const groups = groupResourcesForExport(resources)
  const totalResourcesInGroups = groups.reduce(
    (total, group) => total + (group.homologacao ? 1 : 0) + (group.producao ? 1 : 0),
    0,
  )

  assert.equal(groups.length, 3, 'A (par), B (órfão HML), C (órfão PROD) = 3 grupos')
  assert.equal(
    totalResourcesInGroups,
    resources.length,
    'todo Resource original deve aparecer em exatamente um grupo',
  )
})
