import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyResourceDomain } from './classifyResourceDomain.js'
import type { Resource } from '../models/resource.model.js'

function buildResource(
  overrides: Partial<Resource> & Pick<Resource, 'technicalName' | 'name'>,
): Resource {
  return {
    id: 'test-id',
    type: 'api',
    name: overrides.name,
    technicalName: overrides.technicalName,
    environment: 'homologacao',
    deprecated: false,
    active: true,
    keywords: [],
    tags: [],
    searchIndex: [],
    ...overrides,
  }
}

test('classifica pelo prefixo técnico (algoritmo geral)', () => {
  const cases: [string, string][] = [
    ['FiApiCdcCpfOperacoes', 'CDC'],
    ['FiApiCdcDadosFinanceirosOperacoes', 'CDC'],
    ['FIApiAutIncluirProposta', 'Autorizador / Propostas'],
    ['FIApiAutorizadorPropostasCP', 'Autorizador / Propostas'],
    ['FIAPIEmprCadastroFunc', 'Empréstimos / RH'],
    ['FIAPIEmprConsultaCPF_AUTOSERV', 'Empréstimos / RH'],
    ['FIApiGaBaixaParcelaManual', 'Gestão de Acordos (GA)'],
    ['FIApiTabConsultaBancos', 'Tabelas / Parametrização'],
    ['FIApiModulosCorpConsultarCEP', 'Corporativo / Utilitários'],
    ['FIApiMonitor', 'Corporativo / Utilitários'],
    ['FIApiSIF', 'SIF'],
  ]

  for (const [technicalName, expectedDomain] of cases) {
    const resource = buildResource({ technicalName, name: technicalName })
    assert.equal(classifyResourceDomain(resource), expectedDomain, technicalName)
  }
})

test('recurso sem padrão conhecido cai em "Não classificado"', () => {
  const resource = buildResource({
    technicalName: 'AlgoTotalmenteDesconhecido',
    name: 'Algo Totalmente Desconhecido',
  })
  assert.equal(classifyResourceDomain(resource), 'Não classificado')
})

test('"Ga" seguido de letra minúscula não é confundido com Gestão de Acordos (falso positivo de substring)', () => {
  const resource = buildResource({
    technicalName: 'FiApiGarantiasContabeis',
    name: 'FiApiGarantiasContabeis',
  })
  assert.equal(classifyResourceDomain(resource), 'Não classificado')
})

test('"Auto" seguido de letra minúscula (AutoServico) não é confundido com Autorizador', () => {
  const resource = buildResource({ technicalName: 'FIAPIAutoServico', name: 'FIAPIAutoServico' })
  assert.equal(classifyResourceDomain(resource), 'Não classificado')
})

test('"Autorizador" no meio do nome (não no início) não casa por substring — só via exceção explícita', () => {
  const resource = buildResource({
    technicalName: 'FIApiCallBackAutorizador',
    name: 'FIApiCallBackAutorizador',
  })
  assert.equal(classifyResourceDomain(resource), 'Autorizador / Propostas')
})

test('technicalName gerado por slugify (sem fronteira de maiúscula) cai para o campo "name"', () => {
  const resource = buildResource({
    technicalName: 'fiapiemprgerarboleto',
    name: 'FIAPIEmprGerarBoleto',
  })
  assert.equal(classifyResourceDomain(resource), 'Empréstimos / RH')
})

test('exceções explícitas aprovadas retornam o domínio combinado, mesmo sem prefixo reconhecível', () => {
  const cases: [string, string, string][] = [
    [
      'web-api-para-inclusao-de-proposta-consig',
      'Web Api para Inclusão de Proposta Consig',
      'Autorizador / Propostas',
    ],
    ['fiapiatualizarinformacoesrh', 'FIApiAtualizarInformacoesRH', 'Empréstimos / RH'],
    ['FIApiCallBackAutorizador', 'FIApiCallBackAutorizador', 'Autorizador / Propostas'],
    ['FIApiSrvGACancelamentoAcordo', 'FIApiSrvGACancelamentoAcordo', 'Gestão de Acordos (GA)'],
    ['FiApiAcrPropostaAcordo', 'Web Api Proposta Acordo', 'Gestão de Acordos (GA)'],
  ]

  for (const [technicalName, name, expectedDomain] of cases) {
    const resource = buildResource({ technicalName, name })
    assert.equal(classifyResourceDomain(resource), expectedDomain, technicalName)
  }
})

test('exceção explícita é sensível a maiúsculas apenas na chave, não no valor buscado (case-insensitive)', () => {
  const resource = buildResource({ technicalName: 'FIAPICALLBACKAUTORIZADOR', name: 'x' })
  assert.equal(classifyResourceDomain(resource), 'Autorizador / Propostas')
})

test('Web Service e Site nunca são classificados por heurística — sempre "Não classificado"', () => {
  const webService = buildResource({
    type: 'web-service',
    technicalName: 'WsAutorizador/WSAutorizador.asmx',
    name: 'WsAutorizador/WSAutorizador.asmx',
  })
  const site = buildResource({ type: 'site', technicalName: 'WebCdc', name: 'WebCdc' })

  assert.equal(classifyResourceDomain(webService), 'Não classificado')
  assert.equal(classifyResourceDomain(site), 'Não classificado')
})
