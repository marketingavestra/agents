import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
import fs from 'fs/promises';

async function main() {
  const chromaUrl = process.env.CHROMA_URL_RUNTIME || 'http://chromadb:8000';
  const client = new ChromaClient({ path: chromaUrl });
  const collectionName = process.env.CHROMA_COLLECTION || 'copy_memory';
  const col = await client.getOrCreateCollection({ name: collectionName });
  const id = 'tomy_operational_checklist_v1';
  const text = await fs.readFile('/app/docs/tomy_operational_checklist.md', 'utf8');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
  const openai = new OpenAI({ apiKey });
  const resp = await openai.embeddings.create({ model: embeddingModel, input: [text] });
  const emb = resp.data[0].embedding;
  await col.upsert({ ids: [id], documents: [text], metadatas: [{ source: 'internal', type: 'operational_checklist', agent: 'tomy', version: '1.0.0' }], embeddings: [emb] });
  console.log(JSON.stringify({ ok: true, id, collection: collectionName }));
}

main().catch((e) => { console.error('ERR', e?.message || e); process.exit(1); });
