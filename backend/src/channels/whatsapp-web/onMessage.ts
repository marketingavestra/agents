import type { proto } from '@whiskeysockets/baileys';
import { v4 as uuidv4 } from 'uuid';
import { orchestrate } from '../../orchestrator/route.js';
import { db } from '../../shared/db.js';
import { DEFAULT_TENANT_ID } from '../../shared/constants.js';

async function ensureWAUser(jid: string) {
  const email = `${jid}@wa`;
  await db.query(
    'INSERT INTO users (id, tenant_id, email, role, provider) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id, email) DO NOTHING',
    [uuidv4(), DEFAULT_TENANT_ID, email, 'member', 'whatsapp']
  );
  const r = await db.query('SELECT id FROM users WHERE tenant_id=$1 AND email=$2', [DEFAULT_TENANT_ID, email]);
  return r.rows?.[0]?.id as string;
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

export async function handleInbound(msg: proto.IWebMessageInfo) {
  const key = msg.key;
  const msgId = key?.id || uuidv4();
  const from = key?.remoteJid || 'unknown';
  const to = (msg?.pushName as any) || 'agent';
  const text = (msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || '').trim();
  console.log('[wa-inbound]', { msgId, from, text: text?.slice(0, 200) });

  const userId = await ensureWAUser(from);

  if (!text) return { reply: 'Mensagem vazia recebida.' };

  // Orquestração: decidir agente e sintetizar resposta curta
  const orch = await orchestrate(text);
  const agentName = orch.agent || 'atendimento';
  const conversationId = await ensureConversation(userId, agentName, 'whatsapp');

  // Persist inbound message (tenant default)
  try {
    await db.query(
      'INSERT INTO messages (id, tenant_id, conversation_id, direction, from_jid, to_jid, body, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [uuidv4(), DEFAULT_TENANT_ID, conversationId, 'in', from, to, text, { channel: 'whatsapp', agent: agentName }]
    );
  } catch (e:any) { console.error('[db] insert inbound failed:', e?.message || e); }

  let reply = `Rota: ${agentName} (status: ${orch.status})`;
  try {
    if (orch.agent === 'atendimento') {
      const out = orch.output || {};
      const cl = out.classificacao ? `${out.classificacao.intencao}/${out.classificacao.categoria} (urgência: ${out.classificacao.urgencia})` : 'classificação pendente';
      const passos = (out.proximosPassos || []).slice(0, 3).join(' \n- ');
      reply = `Triagem: ${cl}\nPróximos passos:\n- ${passos || 'aguarde retorno do time'}`;
    } else if (orch.agent === 'agendamento') {
      const faltas = (orch.output?.perguntasFaltantes || []).join('; ');
      reply = faltas ? `Agendamento: preciso de ${faltas}.` : 'Agendamento: vou propor horários em instantes.';
    } else if (orch.agent === 'coleta-documental') {
      const faltas = (orch.output?.perguntasFaltantes || []).join('; ');
      const itens = (orch.output?.solicitacoes || []).slice(0,3).join(' | ');
      reply = `Coleta: ${faltas ? 'faltam: ' + faltas : 'ok'}. Solicitações: ${itens || 'serão enviadas'}`;
    } else if (orch.agent === 'fechamento-contrato') {
      const faltas = (orch.output?.perguntasFaltantes || []).join('; ');
      reply = faltas ? `Fechamento: preciso de ${faltas}.` : 'Fechamento: envio proposta resumida em seguida.';
    } else if (orch.agent === 'editor-contratos') {
      reply = 'Editor: vou revisar as cláusulas e apontar ajustes.';
    } else if (orch.agent === 'gerenciador-prazos') {
      reply = 'Prazos: vou avaliar a base legal e calcular datas.';
    } else if (orch.agent === 'analista-riscos') {
      reply = 'Riscos: vou mapear riscos e mitigações principais.';
    } else if (orch.agent === 'pesquisador') {
      reply = orch.status === 'OK' ? 'Pesquisa: encontrei evidências relevantes.' : 'Pesquisa: faltam evidências, vou buscar fontes.';
    }
  } catch {}

  // Persist outbound reply
  try {
    await db.query(
      'INSERT INTO messages (id, tenant_id, conversation_id, direction, from_jid, to_jid, body, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [uuidv4(), DEFAULT_TENANT_ID, conversationId, 'out', 'agent', from, reply, { channel: 'whatsapp', agent: agentName }]
    );
    await db.query('UPDATE conversations SET last_active_at=now() WHERE id=$1', [conversationId]);
  } catch (e:any) { console.error('[db] insert outbound failed:', e?.message || e); }

  return { reply };
}
