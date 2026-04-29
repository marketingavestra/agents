import pg from 'pg';

const POSTGRES_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';

export const db = new pg.Pool({ connectionString: POSTGRES_URL || undefined });

export async function healthCheckDB() {
  if (!POSTGRES_URL) return { ok: false, reason: 'POSTGRES_URL not set' } as const;
  try {
    const r = await db.query('SELECT 1 as ok');
    return { ok: r.rows?.[0]?.ok === 1 } as const;
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'db error' } as const;
  }
}
