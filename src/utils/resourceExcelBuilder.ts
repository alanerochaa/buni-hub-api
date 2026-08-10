import ExcelJS from 'exceljs'
import type { Resource, ResourceEnvironment, ResourceType } from '../models/resource.model.js'

const ENVIRONMENT_LABELS: Record<ResourceEnvironment, string> = {
  homologacao: 'Homologação',
  producao: 'Produção',
  unknown: 'Desconhecido',
}

const TYPE_LABELS: Record<ResourceType, string> = {
  api: 'API',
  'web-service': 'Web Service',
  site: 'Site',
}

const COLUMNS: { header: string; key: string }[] = [
  { header: 'Código', key: 'code' },
  { header: 'Nome', key: 'name' },
  { header: 'Tipo', key: 'type' },
  { header: 'Ambiente', key: 'environment' },
  { header: 'Status', key: 'status' },
  { header: 'Responsável', key: 'responsible' },
  { header: 'URL', key: 'url' },
  { header: 'Última atualização', key: 'updatedAt' },
]

export interface ResourceExportSheet {
  name: string
  resources: Resource[]
}

function resolveStatusLabel(resource: Resource): string {
  if (!resource.active) return 'Inativo'
  if (resource.deprecated) return 'Ativo (Descontinuado)'
  return 'Ativo'
}

function toRow(resource: Resource): Record<string, string | Date | undefined> {
  return {
    code: resource.code ?? '',
    name: resource.name,
    type: TYPE_LABELS[resource.type],
    environment: ENVIRONMENT_LABELS[resource.environment],
    status: resolveStatusLabel(resource),
    responsible: resource.responsible ?? '',
    url: resource.url ?? '',
    updatedAt: resource.updatedAt ? new Date(resource.updatedAt) : undefined,
  }
}

// Sem auto-fit nativo no ExcelJS: aproxima a largura pelo maior conteúdo já
// renderizado em cada coluna (cabeçalho incluído), com piso e teto razoáveis.
function autoFitColumns(sheet: ExcelJS.Worksheet): void {
  sheet.columns.forEach((column) => {
    if (!column.eachCell) return
    let maxLength = typeof column.header === 'string' ? column.header.length : 10
    column.eachCell({ includeEmpty: false }, (cell) => {
      const text = cell.value instanceof Date ? cell.text : String(cell.value ?? '')
      maxLength = Math.max(maxLength, text.length)
    })
    column.width = Math.min(Math.max(maxLength + 2, 12), 60)
  })
}

function addSheet(workbook: ExcelJS.Workbook, sheetName: string, resources: Resource[]): void {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = COLUMNS.map((column) => ({ header: column.header, key: column.key }))
  sheet.getRow(1).font = { bold: true }

  for (const resource of resources) {
    const row = sheet.addRow(toRow(resource))
    const updatedAtCell = row.getCell('updatedAt')
    if (updatedAtCell.value instanceof Date) {
      updatedAtCell.numFmt = 'dd/mm/yyyy hh:mm'
    }
  }

  autoFitColumns(sheet)
}

/**
 * Gera o .xlsx em memória — nunca grava arquivo em disco. Uma aba por entrada de
 * `sheets`, sempre com cabeçalho, mesmo quando `resources` está vazio.
 */
export async function buildResourcesExportWorkbook(sheets: ResourceExportSheet[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Buni API Hub'
  workbook.created = new Date()

  for (const sheet of sheets) {
    addSheet(workbook, sheet.name, sheet.resources)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
