
export function substituteResourceDomain(value: string, from: string, to: string): string {
  let source: URL
  let fromOrigin: URL
  let toOrigin: URL

  try {
    source = new URL(value)
    fromOrigin = new URL(from)
    toOrigin = new URL(to)
  } catch {
    return value
  }

  if (source.origin !== fromOrigin.origin) return value

  return `${toOrigin.origin}${source.pathname}${source.search}${source.hash}`
}
