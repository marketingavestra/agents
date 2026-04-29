import { z } from 'zod';
import { db } from '../../shared/db.js';
import { DEFAULT_TENANT_ID } from '../../shared/constants.js';
import { v4 as uuidv4 } from 'uuid';
import { CopyBriefSchema, CopyBriefPartialSchema, CopyBriefPartial } from './schema.js';

export type SlotName = keyof z.infer<typeof CopyBriefSchema>;

export function mergeBrief(oldData: any, patch: any) {
  const merged = { ...(oldData || {}) };
  for (const k of Object.keys(patch || {})) {
    const v = (patch as any)[k];
    if (v === undefined || v === null || v === '') continue;
    merged[k] = v;
  }
  return merged;
}

export function computeMissingSlots(brief: CopyBriefPartial) {
  // Mantém uma lista de campos úteis para orientar perguntas,
  // mas a decisão de gerar usa um gate essencial separado (see: canProceedToGenerate)
  const required: SlotName[] = ['objetivo','publico','produto','canal','estagio_funil'];
  const canal = brief.canal || 'landing';
  if (canal === 'landing') {
    required.push('proposta_valor');
    required.push('cta_principal');
  }
  if ((brief.dores || []).length === 0) {
    required.push('dores');
  }
  const missing: SlotName[] = [];
  for (const k of required) {
    const v = (brief as any)[k];
    if (k === 'dores') {
      if (!Array.isArray(v) || v.length === 0) missing.push(k);
    } else if (!v) missing.push(k);
  }
  return missing;
}

export function canProceedToGenerate(brief: CopyBriefPartial) {
  // Gatilho de ação (CopyPro): com Produto + (Dor OU Objetivo) → já pode gerar a primeira versão.
  const hasProduto = !!brief.produto;
  const hasObjetivo = !!brief.objetivo;
  const hasDores = Array.isArray(brief.dores) && brief.dores.length > 0;
  // Canal/estágio ajudam, mas não bloqueiam; defaultamos quando possível.
  return hasProduto && (hasObjetivo || hasDores);
}

function chooseNextSlot(missing: SlotName[], merged: any) {
  const prio: SlotName[] = [
    'objetivo','publico','produto','proposta_valor','dores','cta_principal','tom_voz','canal','estagio_funil','objecoes'
  ];
  for (const p of prio) if (missing.includes(p)) return p;
  return missing[0];
}

export function generateQuestion(missing: SlotName[], merged: any, channel: 'web'|'whatsapp') {
  const slot = chooseNextSlot(missing, merged);
  let question = '';
  if (slot === 'proposta_valor') {
    question = 'Qual é a proposta de valor central? Ex.: “aprender a falar com confiança em 4 semanas”.';
  } else if (slot === 'dores') {
    question = 'Qual é a principal dor do seu público hoje? Ex.: “insegurança ao falar em público”.';
  } else if (slot === 'objecoes') {
    question = 'Existe alguma objeção comum que precisamos tratar? (preço, tempo, confiança?)';
  } else if (slot === 'cta_principal') {
    question = 'Qual CTA você prefere? (Agendar avaliação, Testar grátis, Falar no WhatsApp, Outro)';
  } else if (slot === 'tom_voz') {
    question = 'Qual tom de voz devemos usar? (direto, acolhedor, autoridade, descontraído?)';
  } else if (slot === 'publico') {
    question = 'Quem é o público-alvo em 1 frase? Ex.: “profissionais liberais iniciantes”.';
  } else if (slot === 'produto') {
    question = 'Qual é o produto/oferta exatamente? Ex.: “Curso online de oratória prática”.';
  } else if (slot === 'objetivo') {
    question = 'O que você quer produzir agora? Ex.: “headline para a landing do curso”.';
  } else if (slot === 'canal') {
    question = 'Qual canal principal desta peça? (landing, email, anúncio, social, whatsapp)';
  } else if (slot === 'estagio_funil') {
    question = 'Estamos no topo, meio ou fundo de funil para este material?';
  }
  return { slot, question };
}

export function buildHumanAsk(merged: any, q: {slot: SlotName, question: string}) {
  const parts: string[] = [];
  if (merged.objetivo) parts.push(`Entendi que você quer ${merged.objetivo}.`);
  if (merged.publico) parts.push(`Público: ${merged.publico}.`);
  if (merged.produto) parts.push(`Produto/oferta: ${merged.produto}.`);
  const summary = parts.length ? parts.join(' ') + ' ' : '';
  return `${summary}${q.question}`;
}

export async function loadOrCreateBrief(conversationId: string) {
  const r = await db.query('SELECT id, data, stage FROM briefs WHERE tenant_id=$1 AND conversation_id=$2', [DEFAULT_TENANT_ID, conversationId]);
  if (r.rowCount > 0) return { id: r.rows[0].id as string, data: r.rows[0].data || {}, stage: r.rows[0].stage as string };
  const id = uuidv4();
  await db.query('INSERT INTO briefs (id, tenant_id, conversation_id, data, stage) VALUES ($1,$2,$3,$4,$5)', [id, DEFAULT_TENANT_ID, conversationId, {}, 'collecting']);
  return { id, data: {}, stage: 'collecting' };
}

export async function saveBrief(briefId: string, data: any, stage: string) {
  await db.query('UPDATE briefs SET data=$1, stage=$2, updated_at=now() WHERE id=$3', [data, stage, briefId]);
}

// NLU leve para conversas naturais
export function classifyUtterance(text: string) {
  const t = (text || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
  const isGreeting = /(oi|ola|bom dia|boa tarde|boa noite|salve|e ai|opa)\b/.test(t);
  const isThanks = /(obrigado|valeu|agradec|thanks)/.test(t);
  const isQuestion = /\?|^como\b|^quando\b|^onde\b|^por que\b|^pq\b|^posso\b|^devo\b/.test(t);
  const isRequest = /(gera(r)?|cria(r)?|faz(er)?|escreve(r)?|monta(r)?|produz(ir)?|headline|copy|anuncio|email|landing)/.test(t);
  return {
    greeting: !!isGreeting,
    thanks: !!isThanks,
    question: !!isQuestion,
    request: !!isRequest,
    intent: isGreeting ? 'greeting' : (isQuestion ? 'question' : (isRequest ? 'request' : 'unknown'))
  } as const;
}

export function extractSlotPatch(text: string): any {
  const patch: any = {};
  const s = (text||'');
  // Heurísticas melhoradas
  // Público explícito
  const mPublico = s.match(/(?:publico|p[úu]blico|audiencia|audi[êe]ncia)[:\- ]+([^\.;\n]+)/i);
  if (mPublico) patch.publico = mPublico[1].trim();
  // Público por padrões comuns
  if (!patch.publico) {
    const mLeads = s.match(/\b(leads?\s+(frios|quentes|novos)|novos\s+leads)\b/i);
    if (mLeads) patch.publico = mLeads[0].trim();
  }
  // Produto/Oferta em linguagem natural
  const mProduto1 = s.match(/\b(?:produto|oferta)\s*(?:[eé]|eh)\s+([^\.;\n]+)/i);
  const mProduto2 = s.match(/\bmeu(?:\s+produto|\s+oferta)?\s*(?:[eé]|eh)\s+([^\.;\n]+)/i);
  const mProduto3 = s.match(/\b(?:minha|meu)\s+(?:solu[cç][aã]o|p[ií]lula|pirula|servi[cç]o)\s*(?:[eé]|eh)?\s*([^\.;\n]+)/i);
  const mProduto4 = s.match(/\b(?:produto|oferta)[:\- ]+([^\.;\n]+)/i);
  const mProduto = mProduto1||mProduto2||mProduto3||mProduto4;
  if (mProduto) patch.produto = (mProduto[1]||mProduto[0]).trim();
  
  // Objetivo
  const mObjetivo = s.match(/\b(?:objetivo|preciso|quero|queria|gostaria|ajude|ajuda|cop(?:y|ies)?|email\s*marketing)[:\- ]*(?:de\s|que\sme\sajude\s(?:a\s)?|um\s|uma\s)?([^\.;\n]+)/i);
  if (mObjetivo) patch.objetivo = mObjetivo[1].trim();
  // Canal: email marketing
  if (/email\s*marketing/i.test(s)) patch.canal = 'email';
  const mCanal = s.match(/\b(landing|email|anuncio|social|whatsapp|roteiro)\b/i);
  if (mCanal) patch.canal = (patch.canal||mCanal[1].toLowerCase());
  
  // Estágio por menções indiretas
  const mEstagio = s.match(/\b(TOFU|MOFU|BOFU)\b/i);
  if (mEstagio) patch.estagio_funil = mEstagio[1].toUpperCase();
  // Mapear termos PT-BR comumente usados
  if (!patch.estagio_funil) {
    if (/(topo\s+de\s+funil|^topo\b|\btofu\b)/i.test(s)) patch.estagio_funil = 'TOFU';
    else if (/(meio\s+de\s+funil|^meio\b|\bmofu\b)/i.test(s)) patch.estagio_funil = 'MOFU';
    else if (/(fundo\s+de\s+funil|^fundo\b|\bbofu\b)/i.test(s)) patch.estagio_funil = 'BOFU';
  }
  // Heurísticas por intenção
  if (!patch.estagio_funil) {
    if (/(novos\s+leads|atrair|descoberta|visibilidade|curiosidade)/i.test(s)) patch.estagio_funil = 'TOFU';
    else if (/(nutrir|considera[cç][aã]o|comparar)/i.test(s)) patch.estagio_funil = 'MOFU';
    else if (/(converter|compra|comprar|fechamento|venda)/i.test(s)) patch.estagio_funil = 'BOFU';
  }
  
  // CTA / PV
  const mCTA = s.match(/(?:cta|chamada|call to action)[:\- ]+([^\.;\n]+)/i);
  if (mCTA) patch.cta_principal = mCTA[1].trim();
  const mPV = s.match(/(?:proposta de valor|benef[ií]cio central|promessa)[:\- ]+([^\.;\n]+)/i);
  if (mPV) patch.proposta_valor = mPV[1].trim();
  
  // Dores por menções comuns (sem rótulo)
  const dores: string[] = [];
  if (/(tdah)/i.test(s)) dores.push('TDAH / dificuldade de manter foco');
  if (/(foc[oa]r?|concentra[cç][aã]o)/i.test(s)) dores.push('Falta de foco/concentração');
  if (/(mem[óo]ria|esquec[ei])/i.test(s)) dores.push('Esquecimento / memória fraca');
  const mDor = s.match(/(?:dor|problema)[:\- ]+([^\.;\n]+)/i);
  if (mDor) dores.push(mDor[1].trim());
  if (dores.length) patch.dores = Array.from(new Set( dores ));

  // Público via "para ..."
  if (!patch.publico) {
    const mPara = s.match(/\bpara\b\s+([^\.;\n]+)/i);
    if (mPara && !mPara[1].toLowerCase().startsWith('que')) {
      patch.publico = mPara[1].trim();
    }
  }

  return patch;
}

export function buildGreetingAsk(merged: any, q: {slot: SlotName, question: string}) {
  const base = buildHumanAsk(merged, q);
  return `Oi! ${base}`;
}

// Captura nome do usuário para personalizar saudações
export function extractUserName(text: string): string | undefined {
  const s = (text||'');
  const m = s.match(/\b(meu\s+nome\s+é|me\s+chamo|sou\s+o|sou\s+a)\s+([A-Za-zÀ-ú]+)\b/i);
  if (m) return m[2].trim();
  return undefined;
}
