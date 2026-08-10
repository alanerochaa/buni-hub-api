import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { ResourceUsageRecord, ResourceUsageRepository } from '../models/resourceUsage.model.js'
import { withFileLock } from '../utils/fileLock.js'

export class JsonResourceUsageRepository implements ResourceUsageRepository {
  private cache: ResourceUsageRecord[] | null = null

  constructor(
    private readonly dataFilePath: string = path.join(
      import.meta.dirname,
      '../data/resourceUsage.json',
    ),
  ) {}

  private load(): ResourceUsageRecord[] {
    if (this.cache === null) {
      this.cache = this.readFromDisk()
    }
    return this.cache
  }

  private readFromDisk(): ResourceUsageRecord[] {
    return existsSync(this.dataFilePath)
      ? (JSON.parse(readFileSync(this.dataFilePath, 'utf-8')) as ResourceUsageRecord[])
      : []
  }

  increment(resourceId: string, date: string): void {
    withFileLock(this.dataFilePath, () => {
      const records = this.readFromDisk()
      const existing = records.find(
        (record) => record.resourceId === resourceId && record.date === date,
      )
      if (existing) {
        existing.count += 1
      } else {
        records.push({ resourceId, date, count: 1 })
      }
      this.persist(records)
    })
  }

  findAll(): ResourceUsageRecord[] {
    return this.load()
  }

  private persist(records: ResourceUsageRecord[]): void {
    const tempPath = `${this.dataFilePath}.tmp`
    writeFileSync(tempPath, JSON.stringify(records, null, 2), 'utf-8')
    renameSync(tempPath, this.dataFilePath)
    this.cache = records
  }
}
