'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';
import '../dash.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = auth.onAuthStateChanged((user: any) => {
      if (user) {
        localStorage.setItem('av_auth', '1');
        router.replace('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Developer Bypass
      if (email === 'admin@avestra.com.br' && password === 'admin123') {
        localStorage.setItem('av_auth', '1');
        router.push('/dashboard');
        return;
      }

      if (!auth) throw new Error('Serviço de autenticação não disponível.');
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem('av_auth', '1');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Erro de login:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setError('Ocorreu um erro ao entrar. Tente novamente.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/Avestraaa.png" alt="Avestra" style={{ height: 40, width: 'auto' }} />
          <span className="login-logo-sub">Hub Jurídico IA</span>
        </div>

        <h1 className="login-heading">Bem-vindo de volta</h1>
        <p className="login-sub">Acesse o painel de comando da sua empresa</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="login-spinner" />
            ) : (
              'Entrar no painel →'
            )}
          </button>
        </form>

        <p className="login-sub" style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
          Não tem uma conta? <Link href="/register" style={{ color: '#7C3AED', fontWeight: 700 }}>Cadastre-se grátis</Link>
        </p>

        <p className="login-footer">
          © 2026 Bonadio Cursos · Dr. Wladmir Bonadio Filho
        </p>
      </div>
    </div>
  );
}
