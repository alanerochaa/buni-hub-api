import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import ExcelJS from 'exceljs'

process.env.JWT_SECRET = 'a'.repeat(32)
process.env.NODE_ENV ??= 'test'

const { ResourceRepository } = await import('../repositories/resource.repository.js')
const { JsonResourceUsageRepository } = await import('../repositories/resourceUsage.repository.js')
const { ResourceService } = await import('./resource.service.js')
const { ResourceExportService } = await import('./resourceExport.service.js')

function setupServices() {
  const dir = mkdtempSync(path.join(tmpdir(), 'buni-resources-export-'))
  const dataFilePath = path.join(dir, 'resources.json')
  writeFileSync(dataFilePath, '[]', 'utf-8')
  const repository = new ResourceRepository(dataFilePath)
  const usageRepository = new JsonResourceUsageRepository(path.join(dir, 'resourceUsage.json'))
  const resourceService = new ResourceService(repository, usageRepository)
  const exportService = new ResourceExportService(resourceService)
  return { resourceService, exportService, repository, dir }
}

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  return workbook
}

// Um workbook recarregado de um .xlsx real (round-trip) perde as "keys" de coluna
// do ExcelJS (elas só existem em memória, não fazem parte do formato do arquivo) —
// por isso localizamos a coluna pelo texto do cabeçalho, não por `getCell(key)`.
function columnIndexByHeader(sheet: ExcelJS.Worksheet, header: string): number {
  let columnIndex = -1
  sheet.getRow(1).eachCell((cell, colNumber) => {
    if (cell.text === header) columnIndex = colNumber
  })
  if (columnIndex === -1)
    throw new Error(`Cabeçalho "${header}" não encontrado na aba "${sheet.name}"`)
  return columnIndex
}

function cellByHeader(sheet: ExcelJS.Worksheet, rowNumber: number, header: string): ExcelJS.Cell {
  return sheet.getRow(rowNumber).getCell(columnIndexByHeader(sheet, header))
}

function headerTexts(sheet: ExcelJS.Worksheet): string[] {
  const texts: string[] = []
  sheet.getRow(1).eachCell((cell) => texts.push(cell.text))
  return texts
}

test('cabeçalho tem exatamente as colunas pedidas, sem Ambiente nem Última atualização', async () => {
  const { resourceService, exportService, dir } = setupServices()
  try {
    resourceService.createResource({
      name: 'FiApiCdcSaldos',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/FiApiCdcSaldos',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })

    const buffer = await exportService.exportToExcel('api')
    const workbook = await loadWorkbook(buffer)
    const sheet = workbook.getWorksheet('APIs')!

    assert.deepEqual(headerTexts(sheet), [
      'Código',
      'Nome',
      'Tipo',
      'Domínio',
      'Status',
      'Responsável',
      'URL HML',
      'URL PROD',
    ])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('HML + PROD do mesmo recurso viram 1 única linha, com URL HML e URL PROD preenchidas e hyperlinks reais', async () => {
  const { resourceService, exportService, repository, dir } = setupServices()
  try {
    const hml = resourceService.createResource({
      name: 'FiApiCdcSaldos',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/FiApiCdcSaldos',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })
    resourceService.createResource({
      name: 'FiApiCdcSaldos',
      type: 'api',
      url: 'https://credito.buni.digital/API/FiApiCdcSaldos',
      environment: 'producao',
      active: true,
      keywords: [],
      tags: [],
    })
    // simula a promoção gravando o pairedResourceId nos dois lados, sem depender do
    // ResourcePromotionService (fora do escopo deste teste)
    const all = resourceService.listResources()
    const prod = all.find((r) => r.environment === 'producao')!

    repository.update(hml.id, { pairedResourceId: prod.id })
    repository.update(prod.id, { pairedResourceId: hml.id })

    const buffer = await exportService.exportToExcel('api')
    const workbook = await loadWorkbook(buffer)
    const sheet = workbook.getWorksheet('APIs')!

    assert.equal(sheet.rowCount, 2, 'cabeçalho + 1 única linha consolidada (não 2)')

    const urlHml = cellByHeader(sheet, 2, 'URL HML')
    const urlProd = cellByHeader(sheet, 2, 'URL PROD')
    assert.equal(urlHml.text, 'https://buncghml.funcao.digital/API/FiApiCdcSaldos')
    assert.equal(urlProd.text, 'https://credito.buni.digital/API/FiApiCdcSaldos')
    assert.equal(
      (urlHml.value as ExcelJS.CellHyperlinkValue).hyperlink,
      'https://buncghml.funcao.digital/API/FiApiCdcSaldos',
    )
    assert.equal(
      (urlProd.value as ExcelJS.CellHyperlinkValue).hyperlink,
      'https://credito.buni.digital/API/FiApiCdcSaldos',
    )

    assert.equal(cellByHeader(sheet, 2, 'Domínio').text, 'CDC')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('recurso só com HML: URL PROD fica vazia, nenhum erro, nenhuma linha extra', async () => {
  const { resourceService, exportService, dir } = setupServices()
  try {
    resourceService.createResource({
      name: 'FIApiTabConsultarAgencias',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/FIApiTabConsultarAgencias',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })

    const buffer = await exportService.exportToExcel('api')
    const workbook = await loadWorkbook(buffer)
    const sheet = workbook.getWorksheet('APIs')!

    assert.equal(sheet.rowCount, 2)
    assert.equal(cellByHeader(sheet, 2, 'URL PROD').text, '')
    assert.equal(
      cellByHeader(sheet, 2, 'URL HML').text,
      'https://buncghml.funcao.digital/API/FIApiTabConsultarAgencias',
    )
    assert.equal(cellByHeader(sheet, 2, 'Domínio').text, 'Tabelas / Parametrização')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('Status é sempre "Ativo" ou "Inativo" — nunca aparece "Descontinuado"', async () => {
  const { resourceService, exportService, dir } = setupServices()
  try {
    resourceService.createResource({
      name: 'FIApiGaBaixaParcelaManual',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/FIApiGaBaixaParcelaManual',
      environment: 'homologacao',
      active: false,
      keywords: [],
      tags: [],
    })

    const buffer = await exportService.exportToExcel('api')
    const workbook = await loadWorkbook(buffer)
    const sheet = workbook.getWorksheet('APIs')!
    const statusText = cellByHeader(sheet, 2, 'Status').text

    assert.equal(statusText, 'Inativo')
    assert.doesNotMatch(statusText, /descontinuado/i)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('recurso sem domínio reconhecido recebe "Não classificado"', async () => {
  const { resourceService, exportService, dir } = setupServices()
  try {
    resourceService.createResource({
      name: 'AlgoTotalmenteFora',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/AlgoTotalmenteFora',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })

    const buffer = await exportService.exportToExcel('api')
    const workbook = await loadWorkbook(buffer)
    const sheet = workbook.getWorksheet('APIs')!

    assert.equal(cellByHeader(sheet, 2, 'Domínio').text, 'Não classificado')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('ordena por Domínio e depois por Nome dentro da aba', async () => {
  const { resourceService, exportService, dir } = setupServices()
  try {
    // Empréstimos / RH
    resourceService.createResource({
      name: 'FIApiEmprPropostaRH',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/FIApiEmprPropostaRH',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })
    resourceService.createResource({
      name: 'FIApiEmprCadastroFunc',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/FIApiEmprCadastroFunc',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })
    // CDC
    resourceService.createResource({
      name: 'FiApiCdcSaldos',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/FiApiCdcSaldos',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })

    const buffer = await exportService.exportToExcel('api')
    const workbook = await loadWorkbook(buffer)
    const sheet = workbook.getWorksheet('APIs')!

    const domains = [2, 3, 4].map((row) => cellByHeader(sheet, row, 'Domínio').text)
    const names = [2, 3, 4].map((row) => cellByHeader(sheet, row, 'Nome').text)

    assert.deepEqual(domains, ['CDC', 'Empréstimos / RH', 'Empréstimos / RH'])
    // dentro de "Empréstimos / RH", Cadastro Func vem antes de Proposta RH (ordem alfabética)
    assert.deepEqual(names, ['FiApiCdcSaldos', 'FIApiEmprCadastroFunc', 'FIApiEmprPropostaRH'])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('nenhum recurso lógico é perdido nem duplicado ao exportar "all"', async () => {
  const { resourceService, exportService, dir } = setupServices()
  try {
    resourceService.createResource({
      name: 'FiApiCdcSaldos',
      type: 'api',
      url: 'https://buncghml.funcao.digital/API/FiApiCdcSaldos',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })
    resourceService.createResource({
      name: 'Site Institucional',
      type: 'site',
      url: 'https://buncghml.funcao.digital/institucional',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })
    resourceService.createResource({
      name: 'Web Service Exemplo',
      type: 'web-service',
      url: 'https://buncghml.funcao.digital/ws/exemplo',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })

    const buffer = await exportService.exportToExcel('all')
    const workbook = await loadWorkbook(buffer)

    assert.equal(workbook.getWorksheet('APIs')!.rowCount - 1, 1)
    assert.equal(workbook.getWorksheet('Web Services')!.rowCount - 1, 1)
    assert.equal(workbook.getWorksheet('Sites')!.rowCount - 1, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('Web Service/Site sempre "Não classificado" — sem heurística especulativa de domínio', async () => {
  const { resourceService, exportService, dir } = setupServices()
  try {
    resourceService.createResource({
      name: 'WebCdc',
      type: 'site',
      url: 'https://buncghml.funcao.digital/webcdc',
      environment: 'homologacao',
      active: true,
      keywords: [],
      tags: [],
    })

    const buffer = await exportService.exportToExcel('site')
    const workbook = await loadWorkbook(buffer)
    const sheet = workbook.getWorksheet('Sites')!

    assert.equal(cellByHeader(sheet, 2, 'Domínio').text, 'Não classificado')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
