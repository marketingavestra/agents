import type { EvidenceRef } from '../lib/schema.js';
import { RedatorRequest, RedatorResponse } from '../agents/redator/schema.js';
import { EditorContratosRequest, EditorContratosResponse } from '../agents/editor-contratos/schema.js';
import { PrazosRequest, PrazosResponse } from '../agents/gerenciador-prazos/schema.js';
import { AtendimentoRequest, AtendimentoResponse } from '../agents/atendimento-cliente/schema.js';
import { RiscosRequest, RiscosResponse } from '../agents/analista-riscos/schema.js';

export type PersonaResult<T> = { ok: boolean; reason?: string; output: T };

const bannedCommon = ['venda', 'marketing', 'comercial', 'promo', 'publicidade'];
const bansByAgent: Record<string, string[]> = {
  pesquisador: bannedCommon,
  redator: bannedCommon,
  'editor-contratos': bannedCommon,
  'gerenciador-prazos': bannedCommon,
  'atendimento-cliente': ['marketing puro', 'promo'],
  'analista-riscos': bannedCommon,
};

function isOutOfScope(agent: string, text: string): string | null {
  const bans = bansByAgent[agent] || [];
  const q = (text || '').toLowerCase();
  return bans.some((b) => q.includes(b.replace('*', ''))) ? 'fora do escopo da persona' : null;
}

export function enforcePesquisadorPersona(
  input: { query: string },
  refs: EvidenceRef[],
  candidate: any
): PersonaResult<any> {
  const oos = isOutOfScope('pesquisador', input.query);
  if (oos) {
    return { ok: true, reason: oos, output: { status: 'INSUFICIENTE', resumo: 'Fora de escopo do Agente Pesquisador. Refine para tema jurídico/evidências.', argumentos: [], citacoes: [], refs: [] } };
  }
  const hasRefs = Array.isArray(refs) && refs.length > 0;
  const allowRefIds = new Set(refs.map((r) => r.id));
  const out = {
    status: hasRefs && candidate?.status === 'OK' ? 'OK' : 'INSUFICIENTE',
    resumo: typeof candidate?.resumo === 'string' ? candidate.resumo : 'Sem evidências suficientes. Refine a consulta ou forneça documentos/fontes.',
    argumentos: Array.isArray(candidate?.argumentos) ? candidate.argumentos : [],
    citacoes: Array.isArray(candidate?.citacoes)
      ? candidate.citacoes.filter((c: any) => c && typeof c.refId === 'string' && allowRefIds.has(c.refId) && typeof c.quote === 'string')
      : [],
    refs,
  };
  if (!hasRefs) { out.argumentos = []; out.citacoes = []; (out as any).refs = []; out.status = 'INSUFICIENTE'; }
  return { ok: true, output: out };
}

export function enforceRedatorPersona(input: RedatorRequest, candidate: any): PersonaResult<RedatorResponse> {
  const oos = isOutOfScope('redator', input.tese);
  if (oos) return { ok: true, reason: oos, output: { status: 'INSUFICIENTE', peca: null, checklistPJe: [], lacunas: ['fora de escopo'] } as any };
  const out: RedatorResponse = { status: 'INSUFICIENTE', peca: null, checklistPJe: Array.isArray(candidate?.checklistPJe) ? candidate.checklistPJe : [], lacunas: Array.isArray(candidate?.lacunas) ? candidate.lacunas : ['pipeline nao implementado'] };
  return { ok: true, output: out };
}

export function enforceEditorContratosPersona(input: EditorContratosRequest, candidate: any): PersonaResult<EditorContratosResponse> {
  const oos = isOutOfScope('editor-contratos', input.contratoAtual);
  if (oos) return { ok: true, reason: oos, output: { status: 'INSUFICIENTE', sugestoes: [], resumo: 'fora de escopo', lacunas: [] } as any };
  const out: EditorContratosResponse = { status: 'INSUFICIENTE', sugestoes: [], resumo: typeof candidate?.resumo === 'string' ? candidate.resumo : 'Pipeline nao implementado', lacunas: Array.isArray(candidate?.lacunas) ? candidate.lacunas : ['implementar sugestoes por clausula'] };
  return { ok: true, output: out };
}

export function enforcePrazosPersona(input: PrazosRequest, candidate: any): PersonaResult<PrazosResponse> {
  const text = `${input.tipoAto} ${input.baseLegal || ''}`;
  const oos = isOutOfScope('gerenciador-prazos', text);
  if (oos) return { ok: true, reason: oos, output: { status: 'INSUFICIENTE', prazo: null, lacunas: ['fora de escopo'] } as any };
  const out: PrazosResponse = { status: 'INSUFICIENTE', prazo: null, lacunas: Array.isArray(candidate?.lacunas) ? candidate.lacunas : ['calculo de prazo nao implementado'] };
  return { ok: true, output: out };
}

export function enforceAtendimentoPersona(input: AtendimentoRequest, candidate: any): PersonaResult<AtendimentoResponse> {
  const oos = isOutOfScope('atendimento-cliente', input.mensagemCliente);
  if (oos) return { ok: true, reason: oos, output: { status: 'INSUFICIENTE', classificacao: null, perguntasFaltantes: [], proximosPassos: ['fora de escopo'], redacoesSensiveisOcultas: true } as any };
  const out: AtendimentoResponse = {
    status: 'INSUFICIENTE',
    classificacao: null,
    perguntasFaltantes: Array.isArray(candidate?.perguntasFaltantes) ? candidate.perguntasFaltantes : [],
    proximosPassos: Array.isArray(candidate?.proximosPassos) ? candidate.proximosPassos : ['pipeline nao implementado'],
    redacoesSensiveisOcultas: true,
  };
  return { ok: true, output: out };
}

export function enforceRiscosPersona(input: RiscosRequest, candidate: any): PersonaResult<RiscosResponse> {
  const oos = isOutOfScope('analista-riscos', input.contexto);
  if (oos) return { ok: true, reason: oos, output: { status: 'INSUFICIENTE', riscos: [], lacunas: ['fora de escopo'] } as any };
  const out: RiscosResponse = { status: 'INSUFICIENTE', riscos: Array.isArray(candidate?.riscos) ? candidate.riscos : [], lacunas: Array.isArray(candidate?.lacunas) ? candidate.lacunas : ['pipeline nao implementado'] };
  return { ok: true, output: out };
}
