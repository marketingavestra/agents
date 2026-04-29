import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { db } from '../shared/db.js';

async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      run_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);
}

async function alreadyRan(name: string) {
  const r = await db.query('SELECT 1 FROM migrations WHERE name=$1', [name]);
  return r.rowCount > 0;
}

async function run() {
  const POSTGRES_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!POSTGRES_URL) {
    console.error('[migrate] POSTGRES_URL not set');
    process.exit(2);
  }
  await ensureMigrationsTable();
  const dir = path.join(process.cwd(), 'src', 'db', 'migrations');
  if (!fs.existsSync(dir)) {
    console.log('[migrate] no migrations dir');
    process.exit(0);
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (await alreadyRan(f)) { console.log(`[migrate] skip ${f}`); continue; }
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    console.log(`[migrate] running ${f}`);
    await db.query('BEGIN');
    try {
      await db.query(sql);
      await db.query('INSERT INTO migrations(name) VALUES($1)', [f]);
      await db.query('COMMIT');
      console.log(`[migrate] done ${f}`);
    } catch (e:any) {
      await db.query('ROLLBACK');
      console.error(`[migrate] failed ${f}:`, e?.message || e);
      process.exit(1);
    }
  }
  process.exit(0);
}

run().catch(e => { console.error('[migrate] fatal:', e); process.exit(1); });
