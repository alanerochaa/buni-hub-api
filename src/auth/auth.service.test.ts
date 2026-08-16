import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

process.env.JWT_SECRET = 'a'.repeat(32)
process.env.NODE_ENV ??= 'test'

const bcrypt = await import('bcryptjs')
const { JsonUserRepository } = await import('../repositories/jsonUser.repository.js')
const { JwtService } = await import('./jwt.service.js')
const { AuthService } = await import('./auth.service.js')

function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), 'buni-auth-service-'))
  const dataFilePath = path.join(dir, 'users.json')
  const now = new Date().toISOString()
  const user = {
    id: 'user-1',
    nome: 'Fulano de Tal',
    email: 'fulano@example.com',
    passwordHash: bcrypt.hashSync('SenhaAtual1', 10),
    role: 'ROLE_USER' as const,
    ativo: true,
    createdAt: now,
    updatedAt: now,
  }
  writeFileSync(dataFilePath, JSON.stringify([user]), 'utf-8')
  const repository = new JsonUserRepository(dataFilePath)
  const service = new AuthService(repository, new JwtService())
  return { service, repository, dir, user }
}

test('1) getProfile retorna dados públicos sem passwordHash', () => {
  const { service, dir, user } = setup()
  try {
    const profile = service.getProfile(user.id)
    assert.equal(profile.nome, 'Fulano de Tal')
    assert.equal('passwordHash' in profile, false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('2) getProfile lança erro para usuário inexistente', () => {
  const { service, dir } = setup()
  try {
    assert.throws(() => service.getProfile('nao-existe'), /não encontrado/i)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('3) changePassword rejeita senha atual incorreta', () => {
  const { service, dir, user } = setup()
  try {
    assert.throws(
      () =>
        service.changePassword(user.id, {
          currentPassword: 'errada',
          newPassword: 'NovaSenha1',
          confirmPassword: 'NovaSenha1',
        }),
      /senha atual incorreta/i,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('4) changePassword troca o hash quando a senha atual está correta', () => {
  const { service, repository, dir, user } = setup()
  try {
    service.changePassword(user.id, {
      currentPassword: 'SenhaAtual1',
      newPassword: 'NovaSenha1',
      confirmPassword: 'NovaSenha1',
    })

    const stored = repository.findById(user.id)!
    assert.equal(bcrypt.compareSync('NovaSenha1', stored.passwordHash), true)
    assert.equal(bcrypt.compareSync('SenhaAtual1', stored.passwordHash), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('5) login grava lastLoginAt no usuário', () => {
  const { service, repository, dir, user } = setup()
  try {
    service.login({ email: user.email, password: 'SenhaAtual1' })
    const stored = repository.findById(user.id)!
    assert.equal(typeof stored.lastLoginAt, 'string')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
