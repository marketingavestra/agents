'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';
import '../dash.css';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      localStorage.setItem('av_auth', '1');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Erro de registro:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else {
        setError('Erro ao criar conta. Verifique se o cadastro está liberado no console do Firebase.');
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

        <h1 className="login-heading">Criar sua conta</h1>
        <p className="login-sub">Comece a usar o Copiloto Jurídico hoje</p>

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
            <label htmlFor="password">Senha (mín. 6 caracteres)</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
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
              'Criar minha conta →'
            )}
          </button>
        </form>

        <p className="login-sub" style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
          Já tem uma conta? <Link href="/login" style={{ color: '#7C3AED', fontWeight: 700 }}>Entrar agora</Link>
        </p>

        <p className="login-footer">
          © 2026 Bonadio Cursos · Dr. Wladmir Bonadio Filho
        </p>
      </div>
    </div>
  );
}
