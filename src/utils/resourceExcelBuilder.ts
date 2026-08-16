import ExcelJS from 'exceljs'
import type { ResourceType } from '../models/resource.model.js'
import type { ResourceDomain } from './classifyResourceDomain.js'

const TYPE_LABELS: Record<ResourceType, string> = {
  api: 'API',
  'web-service': 'Web Service',
  site: 'Site',
}

// Identidade visual do Portal de Serviços — azul marinho no cabeçalho, texto branco.
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1B2A4A' },
}
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' } }
const BORDER_COLOR = { argb: 'FFD9D9D9' }
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: BORDER_COLOR },
  left: { style: 'thin', color: BORDER_COLOR },
  bottom: { style: 'thin', color: BORDER_COLOR },
  right: { style: 'thin', color: BORDER_COLOR },
}
const HYPERLINK_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FF1155CC' }, underline: true }

const COLUMNS: { header: string; key: string }[] = [
  { header: 'Código', key: 'code' },
  { header: 'Nome', key: 'name' },
  { header: 'Tipo', key: 'type' },
  { header: 'Domínio', key: 'domain' },
  { header: 'Status', key: 'status' },
  { header: 'Responsável', key: 'responsible' },
  { header: 'URL HML', key: 'urlHomologacao' },
  { header: 'URL PROD', key: 'urlProducao' },
]

/** Uma linha já consolidada (HML+PROD) e já classificada — o builder só renderiza. */
export interface ResourceExportRow {
  code?: string
  name: string
  type: ResourceType
  domain: ResourceDomain
  active: boolean
  responsible?: string
  urlHomologacao?: string
  urlProducao?: string
}

export interface ResourceExportSheet {
  name: string
  /** Já na ordem final (ex.: Domínio, depois Nome) — o builder não reordena. */
  rows: ResourceExportRow[]
}

function setHyperlinkCell(cell: ExcelJS.Cell, url: string | undefined): void {
  if (!url) return
  cell.value = { text: url, hyperlink: url }
  cell.font = HYPERLINK_FONT
}

function autoFitColumns(sheet: ExcelJS.Worksheet): void {
  sheet.columns.forEach((column) => {
    if (!column.eachCell) return
    let maxLength = typeof column.header === 'string' ? column.header.length : 10
    column.eachCell({ includeEmpty: false }, (cell) => {
      const text = String(cell.text ?? '')
      maxLength = Math.max(maxLength, text.length)
    })
    column.width = Math.min(Math.max(maxLength + 2, 12), 60)
  })
}

function styleHeaderRow(sheet: ExcelJS.Worksheet): void {
  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.border = THIN_BORDER
    cell.alignment = { vertical: 'middle' }
  })
  headerRow.height = 20
}

function addSheet(workbook: ExcelJS.Workbook, sheetName: string, rows: ResourceExportRow[]): void {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = COLUMNS.map((column) => ({ header: column.header, key: column.key }))

  for (const row of rows) {
    const excelRow = sheet.addRow({
      code: row.code ?? '',
      name: row.name,
      type: TYPE_LABELS[row.type],
      domain: row.domain,
      status: row.active ? 'Ativo' : 'Inativo',
      responsible: row.responsible ?? '',
    })
    setHyperlinkCell(
      excelRow.getCell(COLUMNS.findIndex((c) => c.key === 'urlHomologacao') + 1),
      row.urlHomologacao,
    )
    setHyperlinkCell(
      excelRow.getCell(COLUMNS.findIndex((c) => c.key === 'urlProducao') + 1),
      row.urlProducao,
    )
    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = THIN_BORDER
    })
  }

  styleHeaderRow(sheet)

  const lastColumnLetter = sheet.getColumn(COLUMNS.length).letter
  sheet.autoFilter = { from: 'A1', to: `${lastColumnLetter}1` }

  autoFitColumns(sheet)
}

/**
 * Gera o .xlsx em memória — nunca grava arquivo em disco. Uma aba por entrada de
 * `sheets`, sempre com cabeçalho, mesmo quando `rows` está vazio. Não decide nada de
 * domínio/negócio — só renderiza o que já chegou pronto (ver `classifyResourceDomain`
 * e `groupResourcesForExport`).
 */
export async function buildResourcesExportWorkbook(sheets: ResourceExportSheet[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Buni API Hub'
  workbook.created = new Date()

  for (const sheet of sheets) {
    addSheet(workbook, sheet.name, sheet.rows)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
