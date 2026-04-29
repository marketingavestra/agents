import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { searchMemory } from './lib/memory.js';

// Routers por agente (estrutura isolada)
import { copywriterRouter as tomyRouter } from './agents/tomy/router.js';
import { pesquisadorRouter } from './agents/pesquisador/router.js';
import { petiaRouter } from './agents/petiai/router.js';
import { contrataiRouter } from './agents/contratai/router.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health check and root status
app.get('/', (_req, res) => res.json({ name: 'copiloto-backend', status: 'up' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Log simples
app.use((req: any, _res: any, next: any) => {
  console.log(`[backend] ${req.method} ${req.url}`);
  next();
});

// Utilidade compartilhada
app.post('/api/memory/search', async (req: any, res: any) => {
  try {
    const body = z.object({ query: z.string().min(3) }).parse(req.body);
    const refs = await searchMemory(body.query);
    res.json({ refs });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Bad Request' });
  }
});

// Ingestão simples para ChromaDB
import { getVectorStore } from './shared/vectorstore.js';
app.post('/api/memory/upsert', async (req: any, res: any) => {
  try {
    const body = z.object({
      docs: z.array(z.object({ id: z.string().min(1), text: z.string().min(1), meta: z.record(z.any()).optional() })).min(1),
    }).parse(req.body);
    const vs = getVectorStore();
    await vs.upsert(body.docs as any);
    res.json({ ok: true, count: body.docs.length });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Bad Request' });
  }
});

// Métricas simples de uso LLM (para Dashboard Mission Control)
import { db } from './shared/db.js';
app.get('/api/metrics/llm-usage', async (_req: any, res: any) => {
  try {
    const q = `
      SELECT date_trunc('day', created_at) AS day,
             SUM(tokens) AS tokens,
             SUM(cost_cents) AS cost_cents
      FROM runs
      WHERE created_at >= now() - interval '30 days'
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    const r = await db.query(q);
    res.json({ days: r.rows });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || 'metrics error' });
  }
});

// Orchestrator (mantido para web)
import { orchestratorRouter } from './orchestrator/router.js';
app.use('/api/orchestrator', orchestratorRouter);

// Agentes (cada um em sua pasta, podendo compartilhar libs)
// 'tomy' é o nome interno; 'copywriter' é o alias usado por versões antigas do frontend
app.use('/api/agents/tomy', tomyRouter);
app.use('/api/agents/copywriter', tomyRouter);

// Agentes jurídicos (Claude)
app.use('/api/agents/pesquisador', pesquisadorRouter);
app.use('/api/agents/petiai', petiaRouter);
app.use('/api/agents/contratai', contrataiRouter);

const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, async () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
  // WhatsApp desativado por diretriz do usuário: interação SOMENTE via Web
});
