/**
 * Mesma normalização usada em ingestion/src/normalize.ts e
 * web/src/features/catalog/normalizeSearchTerm.ts (minúsculo, sem
 * acento) — duplicada de propósito: api/, web/ e ingestion/ são
 * projetos Node independentes, sem pacote compartilhado.
 */
export function normalizeSearchTerm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
