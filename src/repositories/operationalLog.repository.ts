import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { OperationalEvent, OperationalLogRepository } from '../models/operationalLog.model.js'


const MAX_EVENTS = 2000

export class JsonOperationalLogRepository implements OperationalLogRepository {
  private cache: OperationalEvent[] | null = null

  constructor(
    private readonly dataFilePath: string = path.join(import.meta.dirname, '../data/events.json'),
  ) {}

  private load(): OperationalEvent[] {
    if (this.cache === null) {
      this.cache = existsSync(this.dataFilePath)
        ? (JSON.parse(readFileSync(this.dataFilePath, 'utf-8')) as OperationalEvent[])
        : []
    }
    return this.cache
  }

  append(event: OperationalEvent): void {
    const events = this.load()
    events.push(event)
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS)
    }
    this.persist()
  }

  findAll(): OperationalEvent[] {
    return this.load()
  }

  private persist(): void {
    const tempPath = `${this.dataFilePath}.tmp`
    writeFileSync(tempPath, JSON.stringify(this.cache, null, 2), 'utf-8')
    renameSync(tempPath, this.dataFilePath)
  }
}
