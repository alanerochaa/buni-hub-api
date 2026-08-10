import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ApiError } from './ApiError.js'

test('ApiError.notFound gera status 404 com código padrão', () => {
  const error = ApiError.notFound('Recurso não encontrado')
  assert.equal(error.statusCode, 404)
  assert.equal(error.code, 'RESOURCE_NOT_FOUND')
  assert.equal(error.message, 'Recurso não encontrado')
})

test('ApiError.unauthorized aceita código customizado', () => {
  const error = ApiError.unauthorized('Sessão expirada.', 'TOKEN_EXPIRED')
  assert.equal(error.statusCode, 401)
  assert.equal(error.code, 'TOKEN_EXPIRED')
})
