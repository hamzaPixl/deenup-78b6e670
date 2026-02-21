'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { authApi } = await import('@/lib/auth');
      await authApi.login(email, password);
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 400, margin: '4rem auto', padding: '2rem', background: 'white', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1a1a2e' }}>
        Connexion
      </h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Email</label>
          <input
            id="email"
            data-testid="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Mot de passe</label>
          <input
            id="password"
            data-testid="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>
        {error && (
          <p data-testid="error" style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>
        )}
        <button
          type="submit"
          data-testid="submit"
          disabled={loading}
          style={{ padding: '0.75rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
        Pas de compte ?{' '}
        <Link href="/signup" style={{ color: '#16a34a', fontWeight: 600 }}>S&apos;inscrire</Link>
      </p>
    </main>
  );
}
