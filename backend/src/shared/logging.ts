import { db } from './db.js';
import { DEFAULT_TENANT_ID } from './constants.js';
import { v4 as uuidv4 } from 'uuid';

export type RunLog = {
  agent: string;
  status: string;
  durationMs?: number;
  tokens?: number;
  costCents?: number;
  refsCount?: number;
  extra?: any;
};

export async function logRun(log: RunLog) {
  // Tenta persistir; se falhar, faz console.log como fallback
  try {
    await db.query(
      'INSERT INTO runs (id, tenant_id, agent_id, channel_id, input, output, status, tokens, cost_cents, duration_ms) VALUES ($1,$2,NULL,NULL,$3,$4,$5,$6,$7,$8)',
      [
        uuidv4(),
        DEFAULT_TENANT_ID,
        JSON.stringify({ agent: log.agent }),
        JSON.stringify({ status: log.status, extra: log.extra }),
        log.status,
        log.tokens || 0,
        log.costCents || 0,
        log.durationMs || 0,
      ]
    );
  } catch (e:any) {
    if (process.env.LOG_RUNS !== '0') {
      console.log('[run]', JSON.stringify(log));
    }
  }
}
