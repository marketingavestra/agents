import { Router } from 'express';
import { runPesquisador, Message } from './pipeline.js';
import { db } from '../../shared/db.js';
import { DEFAULT_TENANT_ID } from '../../shared/constants.js';
import { logRun } from '../../shared/logging.js';
import { v4 as uuidv4 } from 'uuid';

export const pesquisadorRouter = Router();

async function ensureUser(email: string) {
  await db.query(
    'INSERT INTO users (id, tenant_id, email, role, provider) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id, email) DO NOTHING',
    [uuidv4(), DEFAULT_TENANT_ID, email, 'member', 'web']
  );
  const r = await db.query('SELECT id FROM users WHERE tenant_id=$1 AND email=$2', [DEFAULT_TENANT_ID, email]);
  return r.rows[0].id as string;
}

async function ensureConversation(userId: string, agentName: string) {
  const r = await db.query(
    'SELECT id FROM conversations WHERE tenant_id=$1 AND user_id=$2 AND agent_name=$3 AND channel=$4 ORDER BY created_at DESC LIMIT 1',
    [DEFAULT_TENANT_ID, userId, agentName, 'web']
  );
  if (r.rowCount > 0) return r.rows[0].id as string;
  const id = uuidv4();
  await db.query(
    'INSERT INTO conversations (id, tenant_id, user_id, agent_name, channel) VALUES ($1,$2,$3,$4,$5)',
    [id, DEFAULT_TENANT_ID, userId, agentName, 'web']
  );
  return id;
}

pesquisadorRouter.post('/run', async (req, res) => {
  const started = Date.now();
  const userKey = (req.headers['x-user'] as string) || req.body?.user_key || 'web-anon';
  const userEmail = userKey.includes('@') ? userKey : `${userKey}@local`;
  const query: string = req.body?.query || req.body?.text || '';

  if (!query.trim()) {
    return res.status(400).json({ error: 'query obrigatória' });
  }

  try {
    const userId = await ensureUser(userEmail);
    const conversationId = await ensureConversation(userId, 'pesquisador');

    // Carrega histórico
    let history: Message[] = [];
    try {
      const r = await db.query(
        "SELECT direction, body FROM messages WHERE tenant_id=$1 AND conversation_id=$2 ORDER BY created_at DESC LIMIT 10",
        [DEFAULT_TENANT_ID, conversationId]
      );
      history = (r.rows as any[]).reverse().map(row => ({
        role: row.direction === 'in' ? 'user' : 'assistant' as const,
        content: typeof row.body === 'string' ? row.body : JSON.stringify(row.body),
      }));
    } catch {}

    // Salva mensagem de entrada
    await db.query(
      'INSERT INTO messages (id, tenant_id, conversation_id, direction, from_jid, to_jid, body) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [uuidv4(), DEFAULT_TENANT_ID, conversationId, 'in', `web:${userKey}`, 'agent:pesquisador', query]
    );

    const result = await runPesquisador(query, history);

    // Salva resposta
    await db.query(
      'INSERT INTO messages (id, tenant_id, conversation_id, direction, from_jid, to_jid, body) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [uuidv4(), DEFAULT_TENANT_ID, conversationId, 'out', 'agent:pesquisador', `web:${userKey}`, result.text]
    );
    await db.query('UPDATE conversations SET last_active_at=now() WHERE id=$1', [conversationId]);

    const totalTokens = (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0);
    await logRun({ agent: 'pesquisador', status: 'OK', durationMs: Date.now() - started, tokens: totalTokens, costCents: 0, extra: result.usage });

    res.json({ status: 'OK', text: result.text, usage: result.usage });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'error' });
  }
});

pesquisadorRouter.post('/clear', async (req, res) => {
  const userKey = (req.headers['x-user'] as string) || req.body?.user_key || 'web-anon';
  const userEmail = userKey.includes('@') ? userKey : `${userKey}@local`;
  try {
    const r = await db.query('SELECT id FROM users WHERE tenant_id=$1 AND email=$2', [DEFAULT_TENANT_ID, userEmail]);
    if (!r.rowCount) return res.json({ ok: true });
    const userId = r.rows[0].id;
    const c = await db.query(
      'SELECT id FROM conversations WHERE tenant_id=$1 AND user_id=$2 AND agent_name=$3 ORDER BY created_at DESC LIMIT 1',
      [DEFAULT_TENANT_ID, userId, 'pesquisador']
    );
    if (c.rowCount > 0) {
      await db.query('DELETE FROM messages WHERE tenant_id=$1 AND conversation_id=$2', [DEFAULT_TENANT_ID, c.rows[0].id]);
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e?.message });
  }
});
