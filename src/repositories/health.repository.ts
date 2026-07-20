import type { ResourceHealth } from '../models/resource.model.js'


export class HealthRepository {
  private readonly cache = new Map<string, ResourceHealth>()
  private readonly offlineSince = new Map<string, string>()

  set(health: ResourceHealth): void {
    const previous = this.cache.get(health.resourceId)

    if (health.status === 'offline') {
      if (previous?.status !== 'offline') {
        this.offlineSince.set(health.resourceId, health.lastCheckedAt)
      }
    } else {
      this.offlineSince.delete(health.resourceId)
    }

    this.cache.set(health.resourceId, health)
  }

  getById(resourceId: string): ResourceHealth | undefined {
    return this.cache.get(resourceId)
  }

  getAll(): ResourceHealth[] {
    return Array.from(this.cache.values())
  }

  getOfflineSince(resourceId: string): string | undefined {
    return this.offlineSince.get(resourceId)
  }
}
