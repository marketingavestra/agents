import { z } from 'zod';
import { CopyBrief, CopyBriefSchema } from './schema.js';
import { COPYWRITER_SYSTEM_PROMPT } from './persona.js';
import { getOpenAI } from '../../shared/openai.js';
import { getVectorStore } from '../../shared/vectorstore.js';

function stripCodeFences(s: string) {
  if (!s) return s;
  // remove ```json ... ``` ou ``` ... ```
  const fence = /```[a-zA-Z]*\n([\s\S]*?)```/m;
  const m = s.match(fence);
  if (m && m[1]) return m[1].trim();
  return s.trim();
}

// Remove saudacoes no inicio da resposta quando ja nao e o primeiro turno
function stripGreeting(text: string, isFirstTurn: boolean): string {
  if (isFirstTurn || !text) return text;
  // Remove "Oi, Bruno!", "Oi!", "Ola!", "Opa!", "E ai," do inicio
  // Padrao: palavra de saudacao + virgula/espaco + nome opcional + pontuacao
  const greetingPattern = /^(oi|ol\u00e1|ola|opa|e a\u00ed|e ai|ol\u00e1|hey)(,?\s+[\w]+)?[!,.]?\s*/i;
  return text.replace(greetingPattern, '').trim();
}

export async function runCopywriter(input: unknown) {
  const brief = CopyBriefSchema.parse(input) as CopyBrief;

  // Buscar referências (opcional)
  let refs: Array<{ id: string; score: number; meta: any }> = [];
  if (brief.referencias_query) {
    try {
      const vs = getVectorStore();
      refs = await vs.query(brief.referencias_query, 5) as any;
    } catch (e) {
      console.warn('[copywriter] vector query failed:', e);
    }
  }

  const styleSwipes = refs.map((r, i) => `[#${i+1} score=${r.score.toFixed?.(3) ?? r.score}]\n${r.meta?.text || ''}`).join('\n\n');

  const rawIn = (input as any) || {};
  const hist = Array.isArray(rawIn._history) ? rawIn._history as Array<{direction:string, body:string}> : [];
  const histText = hist.length
    ? `\nContexto (turnos anteriores, mais antigo \u2192 mais recente):\n${hist.map(h => `- ${h.direction === 'in' ? 'Usuário' : 'Agente'}: ${h.body?.toString().slice(0, 500)}`).join('\n')}`
    : '';

  const prompt = `
Briefing do Cliente:
- Objetivo: ${brief.objetivo || '(não fornecido)'}
- Público: ${brief.publico || '(não fornecido)'}
- Produto/Oferta: ${brief.produto || '(não fornecido)'}
- Canal: ${brief.canal || '(não fornecido)'}
- Estágio do funil: ${brief.estagio_funil || '(não fornecido)'}
${brief.proposta_valor ? `- Proposta de valor: ${brief.proposta_valor}` : ''}
${brief.dores && brief.dores.length > 0 ? `- Dores: ${brief.dores.join('; ')}` : ''}
${brief.objecoes && brief.objecoes.length > 0 ? `- Objeções: ${brief.objecoes.join('; ')}` : ''}

Histórico recente da conversa:
${histText}
${styleSwipes ? `\nReferências (estilo/base):\n${styleSwipes}\n` : ''}

Tarefa: Escreva a copy seguindo as regras da sua persona e o briefing acima.`;

  const { client: openai } = getOpenAI();
  if (!openai) throw new Error('OpenAI client not configured');

  const model = process.env.COPYWRITER_MODEL || process.env.OPENAI_MODEL || process.env.MODEL || 'gpt-4o';
  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      { role: 'system', content: COPYWRITER_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]
  });

  const text = resp.choices?.[0]?.message?.content || '';
  const data = { status: 'OK', text };
  
  const usage = resp.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } as any;
  return { data, usage };
}

// Gera uma pergunta conversacional e humanizada (sem "mensagem pronta")
export async function generateConversationalAsk(params: {
  merged: any,
  nextSlot: string,
  history?: Array<{direction:string, body:string}>,
  tone?: 'greeting'|'question'|'request'|'unknown',
}) {
  const { merged, nextSlot, history = [], tone = 'unknown' } = params;
  const { client: openai } = getOpenAI();
  if (!openai) return 'Para te ajudar de forma mais útil, me diz: o que você quer produzir agora?';

  const briefLines = [
    merged.objetivo ? `- Objetivo: ${merged.objetivo}` : '',
    merged.publico ? `- Público: ${merged.publico}` : '',
    merged.produto ? `- Produto/Oferta: ${merged.produto}` : '',
    merged.canal ? `- Canal: ${merged.canal}` : '',
    merged.estagio_funil ? `- Estágio: ${merged.estagio_funil}` : '',
  ].filter(Boolean).join('\n');
  const currentMsg = history.length > 0 ? history[history.length - 1].body : '(nenhuma)';
  const pastHistory = history.slice(0, -1);
  const histText = pastHistory.length
    ? `\nHistórico anterior:\n${pastHistory.map(h => `- ${h.direction === 'in' ? 'Usuário' : 'Agente'}: ${String(h.body).slice(0,220)}`).join('\n')}`
    : '';

  // Modo casual: sem slot, responde naturalmente sem pedir briefing
  const isCasualMode = !nextSlot;

  const user = isCasualMode
    ? `Mensagem do Usuário: "${currentMsg}"
${histText}
Nome do usuário (se souber): ${merged.nome_usuario || '(não informado)'}

REGRA: Responda APENAS à mensagem acima. Seja natural, humano, direto. NÃO pergunte sobre projetos, produtos, objetivos ou qualquer dado de trabalho. Esta é uma conversa casual.`
    : `Mensagem Atual do Usuário: "${currentMsg}"

[Contexto do Briefing]
Informação principal faltando agora: ${nextSlot}
Brief parcial preenchido:\n${briefLines || '(vazio)'}${histText}

REGRAS DA INTERAÇÃO:
1) Responda PRIMEIRO à mensagem do usuário se houver uma pergunta direta.
2) SE o usuário pediu para criar algo, faça UMA ÚNICA pergunta sobre: ${nextSlot}.
3) NÃO repita perguntas já feitas no histórico.`;

  const isFirstTurn = history.length <= 1;
  const model = process.env.COPYWRITER_MODEL || process.env.OPENAI_MODEL || process.env.MODEL || 'gpt-4o';
  const r = await openai.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      { role: 'system', content: COPYWRITER_SYSTEM_PROMPT },
      { role: 'user', content: user }
    ]
  });
  const raw = (r.choices?.[0]?.message?.content || '').trim();
  const out = stripGreeting(raw, isFirstTurn);
  return out;
}
