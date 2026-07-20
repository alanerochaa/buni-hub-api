import { env } from '../config/env.js'

export type UrlBasedEnvironment = 'homologacao' | 'producao' | 'unknown'

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return undefined
  }
}

const OFFICIAL_HOSTS: Record<'homologacao' | 'producao', string | undefined> = {
  homologacao: hostnameOf(env.resourceDomains.homologacao),
  producao: hostnameOf(env.resourceDomains.producao),
}

export function resolveResourceEnvironmentFromUrl(url: string | undefined): UrlBasedEnvironment {
  if (!url) return 'unknown'

  const hostname = hostnameOf(url)
  if (!hostname) return 'unknown'

  if (hostname === OFFICIAL_HOSTS.homologacao) return 'homologacao'
  if (hostname === OFFICIAL_HOSTS.producao) return 'producao'
  return 'unknown'
}
