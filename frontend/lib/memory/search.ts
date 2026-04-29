import type { EvidenceRef } from '../schema';

// Busca hibrida (stub): no MVP, retornamos mocks com base em palavras-chave.
// Futuro: indexar Obsidian/tribunais + BM25 + vetorial + rerank.
export async function searchMemory(query: string): Promise<EvidenceRef[]> {
  const q = query.toLowerCase();
  const refs: EvidenceRef[] = [];

  if (q.includes('indeniza') && q.includes('moral')) {
    refs.push({
      id: 'stj-2019-12345',
      title: 'STJ — Dano Moral por Atraso de Voo',
      excerpt: 'A jurisprudência do STJ admite indenização por danos morais em caso de atraso de voo que extrapola o razoável, independentemente de prova do prejuízo extrapatrimonial.',
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
  if (refs.length === 0 && q.length > 3) {
    // fallback fraco: retorna um lembrete de insuficiência
    return [];
  }
  return refs;
}
