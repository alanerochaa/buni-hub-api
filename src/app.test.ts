import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

process.env.JWT_SECRET = 'a'.repeat(32)
process.env.NODE_ENV ??= 'test'

const { createApp } = await import('./app.js')
const app = createApp()

test('GET /health responde 200 com status UP (liveness)', async () => {
  const res = await request(app).get('/health')
  assert.equal(res.status, 200)
  assert.equal(res.body.status, 'UP')
})

test('GET /health/ready responde 200 com status READY (readiness)', async () => {
  const res = await request(app).get('/health/ready')
  assert.equal(res.status, 200)
  assert.equal(res.body.status, 'READY')
})

test('GET /resources sem token responde 401', async () => {
  const res = await request(app).get('/resources')
  assert.equal(res.status, 401)
  assert.equal(res.body.code, 'UNAUTHENTICATED')
})

test('rota inexistente responde 404 padronizado', async () => {
  const res = await request(app).get('/rota-que-nao-existe')
  assert.equal(res.status, 404)
  assert.equal(res.body.code, 'ROUTE_NOT_FOUND')
})

test('POST /auth/login com corpo inválido responde 400', async () => {
  const res = await request(app).post('/auth/login').send({ email: '', password: '' })
  assert.equal(res.status, 400)
  assert.equal(res.body.code, 'VALIDATION_ERROR')
})
