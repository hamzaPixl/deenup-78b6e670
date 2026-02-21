import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 1rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1a1a2e' }}>
        🕌 DeenUp
      </h1>
      <p style={{ fontSize: '1.125rem', color: '#4b5563', marginBottom: '2rem' }}>
        La plateforme de quiz islamique compétitif.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link
          href="/login"
          style={{
            padding: '0.75rem 1.5rem',
            background: '#16a34a',
            color: 'white',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Se connecter
        </Link>
        <Link
          href="/signup"
          style={{
            padding: '0.75rem 1.5rem',
            background: '#ffffff',
            color: '#16a34a',
            border: '2px solid #16a34a',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          S&apos;inscrire
        </Link>
      </div>
    </main>
  );
}
