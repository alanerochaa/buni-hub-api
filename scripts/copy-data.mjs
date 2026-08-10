import { cpSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'

const projectRoot = path.join(import.meta.dirname, '..')
const from = path.join(projectRoot, 'src/data')
const to = path.join(projectRoot, 'dist/data')

mkdirSync(to, { recursive: true })

const files = readdirSync(from).filter((file) => /^[\w.-]+\.json$/.test(file) && !file.includes('.bak'))

for (const file of files) {
  cpSync(path.join(from, file), path.join(to, file))
}

console.log(`Arquivos de dados copiados para dist/data/ (${files.join(', ')})`)
