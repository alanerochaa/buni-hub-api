import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

process.env.JWT_SECRET = 'a'.repeat(32)
process.env.NODE_ENV ??= 'test'

const bcrypt = await import('bcryptjs')
const { JsonUserRepository } = await import('../repositories/jsonUser.repository.js')
const { UserService } = await import('./user.service.js')

function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), 'buni-user-service-'))
  const dataFilePath = path.join(dir, 'users.json')
  writeFileSync(dataFilePath, '[]', 'utf-8')
  const repository = new JsonUserRepository(dataFilePath)
  const service = new UserService(repository)
  return { service, repository, dataFilePath, dir }
}

function createAdmin(
  service: InstanceType<typeof UserService>,
  overrides: { nome?: string; email?: string } = {},
) {
  return service.createUser({
    nome: overrides.nome ?? 'Admin Um',
    email: overrides.email ?? 'admin1@example.com',
    password: 'Senha123',
    confirmPassword: 'Senha123',
    role: 'ROLE_ADMIN',
    ativo: true,
  })
}

test('1) createUser gera hash de senha e nunca retorna passwordHash', () => {
  const { service, repository, dir } = setup()
  try {
    const user = createAdmin(service)
    assert.equal('passwordHash' in user, false)

    const stored = repository.findById(user.id)!
    assert.notEqual(stored.passwordHash, 'Senha123')
    assert.equal(bcrypt.compareSync('Senha123', stored.passwordHash), true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('2) createUser rejeita e-mail duplicado', () => {
  const { service, dir } = setup()
  try {
    createAdmin(service, { email: 'dup@example.com' })
    assert.throws(
      () => createAdmin(service, { nome: 'Outro', email: 'dup@example.com' }),
      /já existe/i,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('3) updateUser altera nome sem apagar e-mail já salvo', () => {
  const { service, repository, dir } = setup()
  try {
    const user = createAdmin(service, { email: 'preservar@example.com' })
    service.updateUser(user.id, { nome: 'Novo Nome' }, 'user-outro-admin')

    const stored = repository.findById(user.id)!
    assert.equal(stored.nome, 'Novo Nome')
    assert.equal(stored.email, 'preservar@example.com')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('4) usuário não pode alterar o próprio perfil (role)', () => {
  const { service, dir } = setup()
  try {
    const user = createAdmin(service)
    assert.throws(
      () => service.updateUser(user.id, { role: 'ROLE_USER' }, user.id),
      /não pode alterar o próprio perfil/i,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('5) outro admin pode alterar o perfil de um usuário (não é auto-alteração)', () => {
  const { service, dir } = setup()
  try {
    const admin = createAdmin(service, { email: 'admin-a@example.com' })
    const other = createAdmin(service, { nome: 'Admin Dois', email: 'admin-b@example.com' })
    const updated = service.updateUser(other.id, { role: 'ROLE_USER' }, admin.id)
    assert.equal(updated.role, 'ROLE_USER')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('6) não permite inativar o último admin ativo', () => {
  const { service, dir } = setup()
  try {
    const admin = createAdmin(service)
    assert.throws(
      () => service.updateUser(admin.id, { ativo: false }, 'user-outro'),
      /último administrador/i,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('7) não permite rebaixar o último admin ativo para ROLE_USER', () => {
  const { service, dir } = setup()
  try {
    const admin = createAdmin(service)
    assert.throws(
      () => service.updateUser(admin.id, { role: 'ROLE_USER' }, 'user-outro'),
      /último administrador/i,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('8) permite inativar um admin quando existe outro admin ativo', () => {
  const { service, dir } = setup()
  try {
    const admin = createAdmin(service, { email: 'admin-a@example.com' })
    createAdmin(service, { nome: 'Admin Dois', email: 'admin-b@example.com' })
    const updated = service.updateUser(admin.id, { ativo: false }, 'user-outro')
    assert.equal(updated.ativo, false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('9) resetPassword troca o hash e nunca retorna passwordHash', () => {
  const { service, repository, dir } = setup()
  try {
    const user = createAdmin(service)
    const before = repository.findById(user.id)!.passwordHash

    const result = service.resetPassword(user.id, {
      newPassword: 'NovaSenha1',
      confirmPassword: 'NovaSenha1',
    })

    assert.equal('passwordHash' in result, false)
    const after = repository.findById(user.id)!.passwordHash
    assert.notEqual(after, before)
    assert.equal(bcrypt.compareSync('NovaSenha1', after), true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('10) e-mail duplicado na edição (de outro usuário) é rejeitado', () => {
  const { service, dir } = setup()
  try {
    createAdmin(service, { email: 'ocupado@example.com' })
    const second = createAdmin(service, { nome: 'Admin Dois', email: 'livre@example.com' })
    assert.throws(
      () => service.updateUser(second.id, { email: 'ocupado@example.com' }, 'user-outro'),
      /já existe/i,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
