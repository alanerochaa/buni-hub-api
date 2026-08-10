import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugify, generateResourceId } from './slugify.js'

test('slugify remove acentos, espaços e caixa alta', () => {
  assert.equal(slugify('API de Crédito — Homologação'), 'api-de-credito-homologacao')
})

test('slugify remove hífens nas bordas', () => {
  assert.equal(slugify('  --Serviço--  '), 'servico')
})

test('generateResourceId combina tipo, ambiente e nome técnico', () => {
  assert.equal(generateResourceId('api', 'producao', 'Meu Serviço'), 'api-producao-meu-servico')
})
