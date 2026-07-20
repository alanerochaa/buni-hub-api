import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { HistoryRepository, HistorySnapshot } from '../models/history.model.js'

const MAX_SNAPSHOTS = 2000


export class JsonHistoryRepository implements HistoryRepository {
  private cache: HistorySnapshot[] | null = null

  constructor(
    private readonly dataFilePath: string = path.join(import.meta.dirname, '../data/history.json'),
  ) {}

  private load(): HistorySnapshot[] {
    if (this.cache === null) {
      this.cache = existsSync(this.dataFilePath)
        ? (JSON.parse(readFileSync(this.dataFilePath, 'utf-8')) as HistorySnapshot[])
        : []
    }
    return this.cache
  }

  append(snapshot: HistorySnapshot): void {
    const snapshots = this.load()
    snapshots.push(snapshot)
    if (snapshots.length > MAX_SNAPSHOTS) {
      snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS)
    }
    this.persist()
  }

  findAll(): HistorySnapshot[] {
    return this.load()
  }

  private persist(): void {
    const tempPath = `${this.dataFilePath}.tmp`
    writeFileSync(tempPath, JSON.stringify(this.cache, null, 2), 'utf-8')
    renameSync(tempPath, this.dataFilePath)
  }
}
