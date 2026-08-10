import { mkdirSync, rmSync } from 'node:fs'

const LOCK_RETRY_DELAY_MS = 20
const LOCK_TIMEOUT_MS = 5_000

// Sleep síncrono e bloqueante — aceitável aqui porque o lock protege apenas a
// janela curtíssima de um write em disco (milissegundos), não uma operação de I/O de rede.
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/**
 * Serializa leitura-modificação-escrita de um arquivo usando um diretório de lock,
 * cuja criação (`mkdir`) é atômica no filesystem — inclusive entre processos
 * diferentes (múltiplos workers do Node, PM2 cluster, etc.) que compartilhem o
 * mesmo volume. Isso evita o cenário de "lost update": dois processos lendo o
 * mesmo estado, ambos gravando, um sobrescrevendo o outro.
 */
export function withFileLock<T>(filePath: string, fn: () => T): T {
  const lockDir = `${filePath}.lock`
  const deadline = Date.now() + LOCK_TIMEOUT_MS

  while (true) {
    try {
      mkdirSync(lockDir)
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      if (Date.now() > deadline) {
        throw new Error(
          `Não foi possível obter lock de escrita para "${filePath}" (timeout de ${LOCK_TIMEOUT_MS}ms).`,
          { cause: error },
        )
      }
      sleepSync(LOCK_RETRY_DELAY_MS)
    }
  }

  try {
    return fn()
  } finally {
    rmSync(lockDir, { recursive: true, force: true })
  }
}
