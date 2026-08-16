import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import ExcelJS from 'exceljs'
import type { Resource } from './models/resource.model.js'

process.env.JWT_SECRET = 'a'.repeat(32)
process.env.NODE_ENV ??= 'test'

const { createApp } = await import('./app.js')
const { JwtService } = await import('./auth/jwt.service.js')
const { groupResourcesForExport } = await import('./utils/groupResourcesForExport.js')

const app = createApp()
const token = new JwtService().sign({
  sub: 'test-user',
  email: 'test@buni.digital',
  role: 'ROLE_USER',
})

test('GET /resources/export sem token responde 401 (mesma exigência de GET /resources)', async () => {
  const res = await request(app).get('/resources/export')
  assert.equal(res.status, 401)
  assert.equal(res.body.code, 'UNAUTHENTICATED')
})

test('GET /resources/export?type=inválido responde 400 padronizado', async () => {
  const res = await request(app)
    .get('/resources/export?type=inválido')
    .set('Authorization', `Bearer ${token}`)
  assert.equal(res.status, 400)
  assert.equal(res.body.code, 'VALIDATION_ERROR')
})

test('GET /resources/export (sem type = ALL) devolve um .xlsx válido com 3 abas, headers corretos e sem perder/duplicar recurso lógico', async () => {
  const [resourcesRes, exportRes] = await Promise.all([
    request(app).get('/resources').set('Authorization', `Bearer ${token}`),
    request(app)
      .get('/resources/export')
      .set('Authorization', `Bearer ${token}`)
      .responseType('blob'),
  ])

  assert.equal(exportRes.status, 200)
  assert.equal(
    exportRes.headers['content-type'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  assert.match(
    exportRes.headers['content-disposition'],
    /^attachment; filename="portal-servicos-recursos-\d{4}-\d{2}-\d{2}\.xlsx"$/,
  )

  const buffer = Buffer.isBuffer(exportRes.body) ? exportRes.body : Buffer.from(exportRes.body)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ['APIs', 'Web Services', 'Sites'],
  )

  // Quantidade de linhas exportadas por aba deve bater com o número de recursos
  // LÓGICOS (HML+PROD consolidados), usando o mesmo agrupamento aplicado na
  // exportação — não mais com a contagem "crua" de registros de /summary, já que
  // agora cada par HML/PROD vira uma única linha.
  const resources = resourcesRes.body as Resource[]
  const types = ['api', 'web-service', 'site'] as const
  const sheetNames = { api: 'APIs', 'web-service': 'Web Services', site: 'Sites' } as const

  for (const type of types) {
    const ofType = resources.filter((r) => r.type === type)
    const expectedGroups = groupResourcesForExport(ofType).length
    const sheet = workbook.getWorksheet(sheetNames[type])!
    assert.equal(sheet.rowCount - 1, expectedGroups, `contagem de linhas de "${sheetNames[type]}"`)
  }

  // Cabeçalho exato: sem "Ambiente" nem "Última atualização".
  const apisSheet = workbook.getWorksheet('APIs')!
  const headers: string[] = []
  apisSheet.getRow(1).eachCell((cell) => headers.push(cell.text))
  assert.deepEqual(headers, [
    'Código',
    'Nome',
    'Tipo',
    'Domínio',
    'Status',
    'Responsável',
    'URL HML',
    'URL PROD',
  ])

  // Nenhum Status deve conter "Descontinuado".
  let statusColumn = -1
  apisSheet.getRow(1).eachCell((cell, col) => {
    if (cell.text === 'Status') statusColumn = col
  })
  for (let row = 2; row <= apisSheet.rowCount; row++) {
    const statusText = apisSheet.getRow(row).getCell(statusColumn).text
    assert.ok(
      statusText === 'Ativo' || statusText === 'Inativo',
      `linha ${row}: status inesperado "${statusText}"`,
    )
  }
})

test('GET /resources/export?type=site devolve só a aba "Sites"', async () => {
  const res = await request(app)
    .get('/resources/export?type=site')
    .set('Authorization', `Bearer ${token}`)
    .responseType('blob')

  assert.equal(res.status, 200)
  const buffer = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.body)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ['Sites'],
  )
})

test('GET /resources/export?type=api mantém pelo menos 1 URL HML como hyperlink real', async () => {
  const res = await request(app)
    .get('/resources/export?type=api')
    .set('Authorization', `Bearer ${token}`)
    .responseType('blob')

  assert.equal(res.status, 200)
  const buffer = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.body)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet('APIs')!

  let urlHmlColumn = -1
  sheet.getRow(1).eachCell((cell, col) => {
    if (cell.text === 'URL HML') urlHmlColumn = col
  })

  let foundHyperlink = false
  for (let row = 2; row <= sheet.rowCount && !foundHyperlink; row++) {
    const cell = sheet.getRow(row).getCell(urlHmlColumn)
    const value = cell.value as ExcelJS.CellHyperlinkValue | string | undefined
    if (value && typeof value === 'object' && 'hyperlink' in value) {
      foundHyperlink = true
    }
  }
  assert.ok(
    foundHyperlink,
    'esperava encontrar ao menos uma URL HML como hyperlink real no catálogo real',
  )
})
