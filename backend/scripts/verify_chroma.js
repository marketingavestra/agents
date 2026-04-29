import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ path: 'http://chromadb:8000' });
const name = process.env.CHROMA_COLLECTION || 'copy_memory';
const col = await client.getOrCreateCollection({ name });
const r = await col.get({ ids: ['tomy_operational_checklist_v1'] });
console.log(JSON.stringify(r));
