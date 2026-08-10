// Backfill de `pairedResourceId` para os pares HML/Produção já existentes em resources.json.
// Casa os registros pela mesma chave de identidade (type + code||nome normalizado) usada
// hoje pelo agrupamento do catálogo, e grava o vínculo bidirecional. Não apaga nem
// duplica nenhum registro — apenas preenche um campo novo e opcional.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataPath = path.join(__dirname, '../src/data/resources.json')
const backupPath = `${dataPath}.bak-${Date.now()}`

function normalizeSearchTerm(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function getResourceIdentityKey(resource) {
  const code = resource.code?.trim()
  const identity = code || normalizeSearchTerm(resource.name)
  return `${resource.type}:${identity}`
}

const resources = JSON.parse(readFileSync(dataPath, 'utf-8'))

const byKey = new Map()
for (const resource of resources) {
  const key = getResourceIdentityKey(resource)
  const list = byKey.get(key)
  if (list) list.push(resource)
  else byKey.set(key, [resource])
}

let paired = 0
let alreadyPaired = 0
let ambiguous = 0

for (const [key, group] of byKey) {
  if (group.length !== 2) {
    if (group.length > 2) {
      ambiguous++
      console.warn(`[skip] chave "${key}" tem ${group.length} registros (esperado 2) — não pareado automaticamente.`)
    }
    continue
  }

  const [a, b] = group
  if (a.pairedResourceId === b.id && b.pairedResourceId === a.id) {
    alreadyPaired++
    continue
  }

  a.pairedResourceId = b.id
  b.pairedResourceId = a.id
  paired++
}

copyFileSync(dataPath, backupPath)
writeFileSync(dataPath, JSON.stringify(resources, null, 2), 'utf-8')

console.log(`Backup criado em: ${backupPath}`)
console.log(`Pares vinculados agora: ${paired}`)
console.log(`Já vinculados: ${alreadyPaired}`)
console.log(`Grupos ambíguos (>2 registros, não tocados): ${ambiguous}`)
