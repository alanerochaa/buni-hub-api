import { cpSync } from 'node:fs'
import path from 'node:path'

const projectRoot = path.join(import.meta.dirname, '..')
const from = path.join(projectRoot, 'src/data/resources.json')
const to = path.join(projectRoot, 'dist/data/resources.json')

cpSync(from, to)
console.log('resources.json copiado para dist/data/')
