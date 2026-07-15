import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { EventRepository, OperationalEvent } from '../models/event.model.js'

// Eventos só são gravados em transições reais (ver EventService), não
// a cada sweep — 2000 eventos representam uma margem generosa antes
// de precisar de rotação/paginação.
const MAX_EVENTS = 2000

/**
 * Implementação em arquivo JSON de `EventRepository` — mesmo padrão de
 * `JsonHistoryRepository`/`ResourceRepository` (cache em memória,
 * escrita atômica). Substituível por uma implementação em banco sem
 * alterar EventService.
 */
export class JsonEventRepository implements EventRepository {
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
