import type { Resource } from '../models/resource.model.js'

export type ResourceDomain =
  | 'CDC'
  | 'Autorizador / Propostas'
  | 'Empréstimos / RH'
  | 'Gestão de Acordos (GA)'
  | 'Tabelas / Parametrização'
  | 'Corporativo / Utilitários'
  | 'SIF'
  | 'Não classificado'

const PREFIX_RULES: { domain: ResourceDomain; aliases: string[] }[] = [
  { domain: 'CDC', aliases: ['cdc'] },
  { domain: 'Autorizador / Propostas', aliases: ['autorizador', 'aut'] },
  { domain: 'Empréstimos / RH', aliases: ['empr'] },
  { domain: 'Gestão de Acordos (GA)', aliases: ['ga'] },
  { domain: 'Tabelas / Parametrização', aliases: ['tab'] },
  { domain: 'Corporativo / Utilitários', aliases: ['moduloscorp', 'monitor'] },
  { domain: 'SIF', aliases: ['sif'] },
]

/**
 * Exceções aprovadas manualmente (auditoria de domínios funcionais) para recursos
 * que o algoritmo de prefixo não resolve com segurança — ex.: "Autorizador" aparece
 * no meio do nome, não no início, ou o prefixo real (`Srv`, `Acr`) não é reconhecido.
 * Chave = `technicalName` em minúsculas do lado Homologação (ou do único registro
 * existente, se o recurso não tiver par). Mantido aqui, central e testável, em vez de
 * espalhado — nunca decidir uma exceção dentro do Excel builder.
 */
const EXPLICIT_DOMAIN_OVERRIDES: Record<string, ResourceDomain> = {
  'web-api-para-inclusao-de-proposta-consig': 'Autorizador / Propostas',
  fiapiatualizarinformacoesrh: 'Empréstimos / RH',
  fiapicallbackautorizador: 'Autorizador / Propostas',
  fiapisrvgacancelamentoacordo: 'Gestão de Acordos (GA)',
  fiapiacrpropostaacordo: 'Gestão de Acordos (GA)',
}

function stripFiApiPrefix(value: string): string | null {
  const match = /^fiapi/i.exec(value)
  if (!match) return null
  return value.slice(match[0].length)
}

// Só casa se a letra seguinte ao prefixo for maiúscula (nova palavra) ou fim da
// string — é o que distingue "Ga" + "BaixaParcela" (Gestão de Acordos) de "Ga" +
// "rantias" (Garantias, minúsculo — não é o mesmo prefixo por coincidência).
function matchesAlias(core: string, alias: string): boolean {
  const lowerCore = core.toLowerCase()
  if (!lowerCore.startsWith(alias)) return false
  const boundaryChar = core[alias.length]
  if (boundaryChar === undefined) return true
  return boundaryChar === boundaryChar.toUpperCase() && boundaryChar !== boundaryChar.toLowerCase()
}

function classifyCore(core: string): ResourceDomain | null {
  for (const rule of PREFIX_RULES) {
    if (rule.aliases.some((alias) => matchesAlias(core, alias))) return rule.domain
  }
  return null
}

function classifyByPrefix(value: string): ResourceDomain | null {
  const core = stripFiApiPrefix(value)
  if (core === null) return null
  return classifyCore(core)
}

/**
 * Classificação funcional (domínio de negócio) derivada exclusivamente para a
 * exportação em Excel — nunca persistida em `resources.json`, nunca usada por
 * nenhuma regra de cadastro/consulta. Hoje só se aplica a `type: 'api'`: Web Services
 * e Sites ainda não têm taxonomia própria aprovada, então voltam sempre
 * "Não classificado" por decisão explícita (ver auditoria), não por falha da regra.
 *
 * Tenta, nesta ordem: exceção explícita → prefixo em `technicalName` → prefixo em
 * `name` (cobre recursos cujo `technicalName` foi gerado por slugify e perdeu a
 * fronteira de maiúsculas, ex.: criados manualmente pelo Portal).
 */
export function classifyResourceDomain(resource: Resource): ResourceDomain {
  if (resource.type !== 'api') return 'Não classificado'

  const override = EXPLICIT_DOMAIN_OVERRIDES[resource.technicalName.toLowerCase()]
  if (override) return override

  return (
    classifyByPrefix(resource.technicalName) ??
    classifyByPrefix(resource.name) ??
    'Não classificado'
  )
}
