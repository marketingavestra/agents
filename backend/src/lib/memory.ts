import type { EvidenceRef } from './schema.js';
import { getVectorStore } from '../shared/vectorstore.js';

const vs = getVectorStore();

export async function searchMemory(query: string): Promise<EvidenceRef[]> {
  try {
    const hits = await vs.query(query, 5);
    if (hits.length > 0) {
      return hits.map((h, idx) => ({
        id: h.id || `chroma-${idx}`,
        title: h.meta?.title || 'Documento',
        excerpt: h.meta?.excerpt || (h.meta?.text?.slice(0, 240) || ''),
        source: h.meta?.source || 'chroma',
        url: h.meta?.url,
        date: h.meta?.date,
        score: h.score,
      }));
    }
  } catch (e) {
    // fallback to stub if chroma off
  }

  const q = query.toLowerCase();
  const refs: EvidenceRef[] = [];

  if (q.includes('indeniza') && q.includes('moral')) {
    refs.push({
      id: 'stj-2019-12345',
      title: 'STJ — Dano Moral por Atraso de Voo',
      excerpt:
        'A jurisprudência do STJ admite indenização por danos morais em caso de atraso de voo que extrapola o razoável, independentemente de prova do prejuízo extrapatrimonial.',
      source: 'STJ',
      url: 'https://www.stj.jus.br/',
      date: '2019-03-12',
      score: 0.82,
    });
  }
  if (q.includes('tst') || q.includes('trt')) {
    refs.push({
      id: 'tst-oj-xyz',
      title: 'TST — Orientação Jurisprudencial (exemplo)',
      excerpt: 'A Orientação Jurisprudencial consolida o entendimento quanto a ...',
      source: 'TST',
      url: 'https://www.tst.jus.br/',
      date: '2021-07-08',
      score: 0.74,
    });
  }
  return refs;
}
