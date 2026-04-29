'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface EvidenceRef { id: string; title: string; excerpt: string; source: string; url?: string; date?: string; score?: number; }
interface AgentOut {
  status: 'OK' | 'INSUFICIENTE';
  resumo?: string;
  argumentos?: string[];
  citacoes?: { refId: string; quote: string }[];
  refs: EvidenceRef[];
}

export default function AgentesPage() {
  const [authed, setAuthed] = useState(false);
  const [q, setQ] = useState('precedentes STJ indenização moral');
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<AgentOut | null>(null);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAuthed(localStorage.getItem('av_auth') === '1');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !authed) {
      const t = setTimeout(() => { window.location.href = '/login'; }, 800);
      return () => clearTimeout(t);
    }
  }, [authed]);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
  const runPesquisador = async () => {
    try {
      setErr(''); setLoading(true); setOut(null);
      const url = `${API_BASE}/api/agents/pesquisador/run`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha na API');
      setOut(data);
    } catch (e: any) {
      setErr(e?.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };


  if (!authed) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
        Redirecionando para login...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ color: '#fff', fontFamily: 'DM Sans', fontWeight: 900, letterSpacing: -0.5 }}>Agentes — Time de 6 (MVP)</h1>
      <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0.25rem 0 1rem' }}>Rodar o Agente Pesquisador com verificação de evidências.</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Digite sua consulta (ex.: precedentes STJ ... )"
          style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff' }}
        />
        <button onClick={runPesquisador} disabled={loading} style={{ padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid rgba(124,58,237,0.4)', background: '#7C3AED', color: '#fff', fontWeight: 700 }}>
          {loading ? 'Consultando...' : 'Rodar Pesquisador'}
        </button>
        <Link href="/dashboard" style={{ color: '#A78BFA', alignSelf: 'center' }}>Voltar ao Dashboard</Link>
      </div>

      {err && <div style={{ color: '#FCA5A5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem 1rem', borderRadius: 10 }}>{err}</div>}

      {out && (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '1rem' }}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Status</div>
            <div style={{ fontWeight: 800, color: out.status === 'OK' ? '#4ADE80' : '#FBBF24' }}>{out.status}</div>
          </div>

          {out.resumo && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Resumo</div>
              <div style={{ color: '#E2E8F0' }}>{out.resumo}</div>
            </div>
          )}

          {!!out.argumentos?.length && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Argumentos</div>
              <ul>
                {out.argumentos.map((a, i) => (
                  <li key={i} style={{ color: '#CBD5E1', margin: '0.25rem 0' }}>• {a}</li>
                ))}
              </ul>
            </div>
          )}

          {!!out.citacoes?.length && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Citações</div>
              <ul>
                {out.citacoes.map((c, i) => (
                  <li key={i} style={{ color: '#E5E7EB', margin: '0.25rem 0' }}>
                    <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.35rem', borderRadius: 6 }}>{c.refId}</code> — “{c.quote}”
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!out.refs?.length && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Referências</div>
              <ul>
                {out.refs.map((r) => (
                  <li key={r.id} style={{ margin: '0.4rem 0' }}>
                    <strong style={{ color: '#C4B5FD' }}>[{r.id}] {r.source}</strong> — <span style={{ color: '#E2E8F0' }}>{r.title}</span>
                    <div style={{ color: '#94A3B8', fontSize: 14 }}>{r.excerpt}</div>
                    {r.url && <a href={r.url} target="_blank" style={{ color: '#93C5FD', fontSize: 13 }}>Abrir fonte ↗</a>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
