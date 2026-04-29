import type { VectorStore } from './vectorstore_types.js';
import { ChromaClient, type IncludeEnum } from 'chromadb';
import { getOpenAI } from './openai.js';
import { db } from './db.js';

export type VectorBackend = 'pgvector' | 'chroma' | 'none';

export function getVectorStore(): VectorStore {
  const backend = (process.env.VECTOR_BACKEND as VectorBackend) || 'none';
  if (backend === 'none') {
    return {
      backend,
      async upsert() {},
      async query() { return []; },
    };
  }
  if (backend === 'chroma') {
    const url = process.env.CHROMA_URL || 'http://localhost:8000';
    const collectionName = process.env.CHROMA_COLLECTION || 'legal_memory';
    const client = new ChromaClient({ path: url });
    const { client: openai } = getOpenAI();
    const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

    const getCollection = async () => {
      try {
        return await client.getOrCreateCollection({ name: collectionName });
      } catch {
        return await client.createCollection({ name: collectionName });
      }
    };

    async function embedAll(texts: string[]): Promise<number[][]> {
      if (!openai) throw new Error('OpenAI client not configured for embeddings');
      // Batch in reasonable chunks to avoid limits
      const chunks: string[][] = [];
      const size = 64; // batch size
      for (let i = 0; i < texts.length; i += size) chunks.push(texts.slice(i, i + size));
      const vectors: number[][] = [];
      for (const chunk of chunks) {
        const resp = await openai.embeddings.create({ model: embeddingModel, input: chunk });
        for (const d of resp.data) vectors.push(d.embedding as unknown as number[]);
      }
      return vectors;
    }

    return {
      backend,
      async upsert(docs) {
        const col = await getCollection();
        const embeddings = await embedAll(docs.map((d) => d.text));
        await col.upsert({
          ids: docs.map((d) => d.id),
          documents: docs.map((d) => d.text),
          metadatas: docs.map((d) => ({ ...(d.meta || {}) })),
          embeddings,
        });
      },
      async query(q: string, k: number) {
        const col = await getCollection();
        const [qvec] = await embedAll([q]);
        const r = await col.query({ queryEmbeddings: [qvec as any], nResults: k, include: ["metadatas","distances","documents"] as IncludeEnum[] });
        const ids = r.ids?.[0] || [];
        const distances = r.distances?.[0] || [];
        const metas = r.metadatas?.[0] || [];
        const docs = r.documents?.[0] || [];
        return ids.map((id: string, i: number) => ({ id, score: typeof distances[i] === 'number' ? 1 - distances[i] : 0, meta: { ...(metas[i] || {}), text: docs[i] } }));
      },
    };
  }
  if (backend === 'pgvector') {
    const { client: openai } = getOpenAI();
    const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

    async function embedAll(texts: string[]): Promise<number[][]> {
      if (!openai) throw new Error('OpenAI client not configured for embeddings');
      const chunks: string[][] = [];
      const size = 64;
      for (let i = 0; i < texts.length; i += size) chunks.push(texts.slice(i, i + size));
      const vectors: number[][] = [];
      for (const chunk of chunks) {
        const resp = await openai.embeddings.create({ model: embeddingModel, input: chunk });
        for (const d of resp.data) vectors.push(d.embedding as unknown as number[]);
      }
      return vectors;
    }

    return {
      backend,
      async upsert(docs) {
        const embeddings = await embedAll(docs.map((d) => d.text));
        for (let i = 0; i < docs.length; i++) {
          const d = docs[i];
          const vec = `[${embeddings[i].join(',')}]`;
          await db.query(
            `INSERT INTO legal_memory (id, content, metadata, embedding) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (id) DO UPDATE SET content = $2, metadata = $3, embedding = $4`,
            [d.id, d.text, JSON.stringify(d.meta || {}), vec]
          );
        }
      },
      async query(q: string, k: number) {
        const [qvec] = await embedAll([q]);
        const vec = `[${qvec.join(',')}]`;
        const r = await db.query(
          `SELECT id, content, metadata, 1 - (embedding <=> $1) as score 
           FROM legal_memory 
           ORDER BY embedding <=> $1 
           LIMIT $2`,
          [vec, k]
        );
        return r.rows.map((row: any) => ({
          id: row.id,
          score: row.score,
          meta: { ...(row.metadata || {}), text: row.content },
        }));
      },
    };
  }

  return { backend: 'none', async upsert() {}, async query() { return []; } };
}
