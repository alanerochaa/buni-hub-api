import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { generateResourceId } from '../src/utils/slugify.js'
import type { Resource } from '../src/models/resource.model.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataPath = path.join(__dirname, '../src/data/resources.json')
const backupPath = path.join(__dirname, `../src/data/resources.json.bak-${Date.now()}`)

const raw = readFileSync(dataPath, 'utf-8')
const resources: Resource[] = JSON.parse(raw)

copyFileSync(dataPath, backupPath)
console.log(`Backup criado em: ${backupPath}`)

let changed = 0
const seenIds = new Set<string>()

const migrated = resources.map((resource) => {
  const newId = generateResourceId(resource.type, resource.environment, resource.technicalName)

  if (seenIds.has(newId)) {
    throw new Error(`Colisão de id detectada após migração: ${newId} (recurso "${resource.name}")`)
  }
  seenIds.add(newId)

  if (newId !== resource.id) changed++
  return { ...resource, id: newId }
})

if (migrated.length !== resources.length) {
  throw new Error('Contagem de recursos divergente após migração — abortando sem escrever.')
}

writeFileSync(dataPath, JSON.stringify(migrated, null, 2) + '\n', 'utf-8')

console.log(`Migração concluída: ${migrated.length} recursos processados, ${changed} ids alterados.`)
