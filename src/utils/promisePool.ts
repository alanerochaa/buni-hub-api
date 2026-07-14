/**
 * Executa `task` para cada item de `items`, limitando quantas promises
 * ficam em voo ao mesmo tempo. Evita abrir uma conexão simultânea para
 * cada um dos recursos do catálogo a cada varredura do health check.
 * Não usa nenhuma lib externa (ex.: p-limit) — a lógica cabe em poucas
 * linhas e não justifica uma nova dependência.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++
      results[currentIndex] = await task(items[currentIndex])
    }
  }

  const workerCount = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: workerCount }, worker))

  return results
}
