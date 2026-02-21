import Link from 'next/link';

export default function MatchPage() {
  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/dashboard" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1.5rem' }}>
        ← Tableau de bord
      </Link>

      <div style={{ background: 'white', borderRadius: 12, padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>🏆 Recherche de match</h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Recherche d&apos;un adversaire de niveau similaire...</p>

        <div style={{ width: 120, height: 120, borderRadius: '50%', border: '4px solid #16a34a', margin: '0 auto 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
          🔍
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#4b5563', marginBottom: '1rem' }}>Choisir un thème</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['📖 Quran', '🕌 Prophètes', '☪️ Muhammad ﷺ'].map((theme) => (
              <button
                key={theme}
                style={{ padding: '0.5rem 1rem', background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: 20, fontWeight: 600, cursor: 'pointer', color: '#16a34a' }}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        <button
          style={{ padding: '0.875rem 2.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontSize: '1.125rem', fontWeight: 700, cursor: 'pointer' }}
        >
          Trouver un match
        </button>
      </div>
    </main>
  );
}
