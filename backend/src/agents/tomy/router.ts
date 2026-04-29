import { Router } from 'express';
import { runCopywriter, generateConversationalAsk } from './pipeline.js';
import { db } from '../../shared/db.js';
import { DEFAULT_TENANT_ID } from '../../shared/constants.js';
import { logRun } from '../../shared/logging.js';
import { v4 as uuidv4 } from 'uuid';
import { CopyBriefPartialSchema } from './schema.js';
import { loadOrCreateBrief, mergeBrief, computeMissingSlots, generateQuestion, buildHumanAsk, saveBrief } from './slotfill.js';

export const copywriterRouter = Router();

async function ensureUser(email: string) {
  await db.query(
    'INSERT INTO users (id, tenant_id, email, role, provider) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id, email) DO NOTHING',
    [uuidv4(), DEFAULT_TENANT_ID, email, 'member', 'web']
  );
  const r = await db.query('SELECT id FROM users WHERE tenant_id=$1 AND email=$2', [DEFAULT_TENANT_ID, email]);
  return r.rows?.[0]?.id as string;
}

async function ensureAgent(name: string) {
  // tenta localizar por (tenant_id,name); se não existir, cria registro mínimo
  const sel = await db.query('SELECT id FROM agents WHERE tenant_id=$1 AND name=$2', [DEFAULT_TENANT_ID, name]);
  if (sel.rowCount > 0) return sel.rows[0].id as string;
  const id = uuidv4();
  await db.query(
    'INSERT INTO agents (id, tenant_id, name, type, status, persona) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, DEFAULT_TENANT_ID, name, 'copywriter', 'active', 'Copywriter especializado (AIDA/PAS/4Ps/PASTOR), sem conteúdo jurídico']
  );
  return id;
}

async function ensureConversation(userId: string, agentName: string, channel: string) {
  const q = 'SELECT id FROM conversations WHERE tenant_id=$1 AND user_id=$2 AND agent_name=$3 AND channel=$4 ORDER BY created_at DESC LIMIT 1';
  const r = await db.query(q, [DEFAULT_TENANT_ID, userId, agentName, channel]);
  if (r.rowCount > 0) return r.rows[0].id as string;
  const id = uuidv4();
  await db.query(
    'INSERT INTO conversations (id, tenant_id, user_id, agent_name, channel) VALUES ($1,$2,$3,$4,$5)',
    [id, DEFAULT_TENANT_ID, userId, agentName, channel]
  );
  return id;
}

copywriterRouter.post('/run', async (req, res) => {
  const started = Date.now();
  const userKey = (req.headers['x-user'] as string) || (req.body?.user_key as string) || 'web-anon';
  const userEmail = userKey.includes('@') ? userKey : `${userKey}@local`;
  const fromJid = `web:${userKey}`;
  try {
    // Garante usuário e conversa (copywriter/web)
    const userId = await ensureUser(userEmail);
    await ensureAgent('tomy'); // registra agente se ainda não existir
    const conversationId = await ensureConversation(userId, 'tomy', 'web');

    // Persist inbound (patch do brief) como mensagem de entrada
    try {
      await db.query(
        'INSERT INTO messages (id, tenant_id, conversation_id, direction, from_jid, to_jid, body, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [uuidv4(), DEFAULT_TENANT_ID, conversationId, 'in', fromJid, 'agent:tomy', JSON.stringify(req.body || {}), { channel: 'web', agent: 'copywriter' }]
      );
    } catch (e:any) { console.error('[db] insert inbound(web) failed:', e?.message || e); }

    // Carrega os últimos turnos dessa conversa para contexto
    let history: Array<{direction:string, body:string}> = [];
    try {
      const r = await db.query('SELECT direction, body FROM messages WHERE tenant_id=$1 AND conversation_id=$2 ORDER BY created_at DESC LIMIT 6', [DEFAULT_TENANT_ID, conversationId]);
      history = (r.rows || []).map((row:any) => ({ direction: row.direction, body: row.body })).reverse();
    } catch (e:any) { console.error('[db] load history failed:', e?.message || e); }

    // Slot-filling: carregar/mesclar brief
    const briefRec = await loadOrCreateBrief(conversationId);
    let patch = CopyBriefPartialSchema.parse(req.body || {});
    // NLU leve para texto livre
    const freeText = (req.body?.text || req.body?.query || '').toString().trim();
    let convoTone: 'greeting'|'question'|'request'|'unknown' = 'unknown';

    // Detecta se é mensagem casual: saudacão, autoapresentacão, agradecimento, pergunta sobre o agente
    const isCasualMsg = (text: string) => {
      const t = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      const isGreeting = /\b(oi|ola|bom dia|boa tarde|boa noite|salve|e ai|opa|tudo bem|como vai|como voce esta|como vc)\b/.test(t);
      const isSelfIntro = /meu nome (e|eh|é)|me chamo|sou o |sou a /.test(t);
      const isThanks = /\b(obrigado|valeu|agradec|thanks|brigado|obg)\b/.test(t);
      // Perguntas sobre o agente: nome, capacidades, saudações embutidas
      const isAgentQuestion = /(qual (e|eh|é) (o )?seu nome|como (voce|você) se chama|quem (e|eh|é) (voce|você)|o que voce (faz|consegue|pode)|como voce pode|voce sabe meu nome|seu nome|o seu nome|como (e|eh|é) (o )?seu nome)/.test(t);
      // Mensagens muito curtas sem verbos de ação de criação
      const hasCreationVerb = /(cri(a|e|ar)|gera|faz|escreve|monta|produz|quero um|preciso de um|me (faz|manda|passa))/.test(t);
      const isVeryShortCasual = t.length < 30 && !hasCreationVerb;
      return isGreeting || isSelfIntro || isThanks || isAgentQuestion || isVeryShortCasual;
    };

    const casual = isCasualMsg(freeText);

    if (freeText) {
      const slotfill = await import('./slotfill.js');
      const { intent } = slotfill.classifyUtterance(freeText);
      convoTone = intent as any;

      // Só tenta extrair slots se não for mensagem casual
      if (!casual) {
        const extra = slotfill.extractSlotPatch(freeText);
        const name = slotfill.extractUserName(freeText);

        let newPatch: any = { ...extra, ...patch };
        if (name) newPatch.nome_usuario = name;

        const missingBefore = computeMissingSlots(briefRec.data);
        const nextMissing = missingBefore.length > 0 ? missingBefore[0] : null;

        // Heurística de resposta direta: só aplica fora de tom casual
        if (Object.keys(extra).length === 0 && nextMissing && convoTone === 'unknown' && freeText.length < 50) {
          newPatch[nextMissing] = freeText;
        }

        patch = newPatch;
      } else {
        // Mensagem casual: apenas extrai o nome do usuário se mencionar, sem tocar em slots de briefing
        const name = slotfill.extractUserName(freeText);
        if (name) (patch as any).nome_usuario = name;
      }
    }

    // Mensagens casuais vão direto para o LLM — zero slot-filling
    if (casual) {
      const message = await generateConversationalAsk({ merged: briefRec.data, nextSlot: '', history, tone: convoTone });
      await saveBrief(briefRec.id, { ...briefRec.data, ...(patch as any).nome_usuario ? { nome_usuario: (patch as any).nome_usuario } : {} }, briefRec.stage || 'collecting');
      const resp = { status: 'ASK', slot: '', question: '', message, brief_preview: briefRec.data };
      try {
        await db.query(
          'INSERT INTO messages (id, tenant_id, conversation_id, direction, from_jid, to_jid, body, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [uuidv4(), DEFAULT_TENANT_ID, conversationId, 'out', 'agent:tomy', fromJid, JSON.stringify(resp), { channel: 'web', agent: 'copywriter' }]
        );
        await db.query('UPDATE conversations SET last_active_at=now() WHERE id=$1', [conversationId]);
      } catch (e:any) { console.error('[db] insert outbound(casual) failed:', e?.message || e); }
      return res.json(resp);
    }

    const merged = mergeBrief(briefRec.data, patch);

    // Verificar faltantes e gerar perguntas quando necessário
    // Preencher defaults leves antes da decisão
    if (!merged.canal && /email\s*marketing/i.test(freeText)) merged.canal = 'email';
    if (!merged.variacoes) (merged as any).variacoes = 2;
    if (!merged.tom_voz) (merged as any).tom_voz = 'profissional e persuasivo';

    const missing = computeMissingSlots(merged);

    // Gate essencial: se já temos o bastante, seguimos para geração (evita loop infinito)
    const { canProceedToGenerate } = await import('./slotfill.js');
    const ready = canProceedToGenerate(merged);

    if (!ready) {
      const q = generateQuestion(missing, merged, 'web');
      // Gera uma pergunta humanizada e variada (sem mensagem pronta)
      let message = '';
      try {
        message = await generateConversationalAsk({ merged, nextSlot: q.slot, history, tone: convoTone });
      } catch {
        // Fallback leve
        message = (convoTone === 'greeting')
          ? (await import('./slotfill.js')).buildGreetingAsk(merged, q)
          : buildHumanAsk(merged, q);
      }
      await saveBrief(briefRec.id, merged, 'collecting');
      const need = { status: 'ASK', slot: q.slot, question: q.question, message, brief_preview: merged };
      try {
        await db.query(
          'INSERT INTO messages (id, tenant_id, conversation_id, direction, from_jid, to_jid, body, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [uuidv4(), DEFAULT_TENANT_ID, conversationId, 'out', 'agent:tomy', fromJid, JSON.stringify(need), { channel: 'web', agent: 'copywriter' }]
        );
        await db.query('UPDATE conversations SET last_active_at=now() WHERE id=$1', [conversationId]);
      } catch (e:any) { console.error('[db] insert outbound(web,need) failed:', e?.message || e); }
      return res.json(need);
    }

    // Brief essencial pronto: salvar e gerar
    await saveBrief(briefRec.id, merged, 'ready');

    const result = await runCopywriter({ ...merged, _history: history });
    const out = result.data;
    const usage = result.usage || { prompt_tokens: 0, completion_tokens: 0 } as any;

    // Persist outbound (resposta do agente)
    try {
      await db.query(
        'INSERT INTO messages (id, tenant_id, conversation_id, direction, from_jid, to_jid, body, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [uuidv4(), DEFAULT_TENANT_ID, conversationId, 'out', 'agent:tomy', fromJid, JSON.stringify(out), { channel: 'web', agent: 'copywriter' }]
      );
      await db.query('UPDATE conversations SET last_active_at=now() WHERE id=$1', [conversationId]);
    } catch (e:any) { console.error('[db] insert outbound(web) failed:', e?.message || e); }

    // Custo real (opcional via ENV)
    const IN_BRL_PER_TOKEN = parseFloat(process.env.IN_BRL_PER_TOKEN || '0');
    const OUT_BRL_PER_TOKEN = parseFloat(process.env.OUT_BRL_PER_TOKEN || '0');
    const costBRL = (usage.prompt_tokens * IN_BRL_PER_TOKEN) + (usage.completion_tokens * OUT_BRL_PER_TOKEN);
    const costCents = Math.round((costBRL || 0) * 100);

    // Log de execução (runs) com duração e tokens/custo
    try {
      await logRun({ agent: 'tomy', status: out?.status || 'OK', durationMs: Date.now() - started, tokens: (usage.prompt_tokens||0)+(usage.completion_tokens||0), costCents, extra: { channel: 'web', prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens } });
    } catch {}

    res.json(out);
  } catch (e:any) {
    res.status(400).json({ error: e?.message || 'error' });
  }
});

copywriterRouter.post('/clear', async (req, res) => {
  const userKey = (req.headers['x-user'] as string) || (req.body?.user_key as string) || 'web-anon';
  const userEmail = userKey.includes('@') ? userKey : `${userKey}@local`;
  try {
    const userId = await ensureUser(userEmail);
    const q = 'SELECT id FROM conversations WHERE tenant_id=$1 AND user_id=$2 AND agent_name=$3 AND channel=$4 ORDER BY created_at DESC LIMIT 1';
    const r = await db.query(q, [DEFAULT_TENANT_ID, userId, 'tomy', 'web']);
    if (r.rowCount > 0) {
      const conversationId = r.rows[0].id;
      // Delete messages
      await db.query('DELETE FROM messages WHERE tenant_id=$1 AND conversation_id=$2', [DEFAULT_TENANT_ID, conversationId]);
      // Reset brief
      await db.query("UPDATE briefs SET data='{}', stage='collecting' WHERE tenant_id=$1 AND conversation_id=$2", [DEFAULT_TENANT_ID, conversationId]);
    }
    res.json({ ok: true });
  } catch (e:any) {
    res.status(400).json({ error: e?.message || 'error' });
  }
});
