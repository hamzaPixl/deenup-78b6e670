import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ maxWidth: 500, margin: '6rem auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 900, color: '#16a34a', marginBottom: 0 }}>404</h1>
      <p style={{ fontSize: '1.25rem', color: '#4b5563', margin: '1rem 0 2rem' }}>Page non trouvée</p>
      <Link
        href="/"
        style={{ padding: '0.75rem 1.5rem', background: '#16a34a', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
