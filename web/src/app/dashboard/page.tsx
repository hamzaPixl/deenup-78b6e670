import Link from 'next/link';

export default function DashboardPage() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1a1a2e' }}>🕌 DeenUp</h1>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/profile" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: 600 }}>Profil</Link>
          <Link href="/login" style={{ color: '#6b7280', textDecoration: 'none' }}>Déconnexion</Link>
        </nav>
      </header>

      <section style={{ background: 'white', borderRadius: 12, padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Jouer</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            href="/match"
            style={{ flex: 1, minWidth: 160, padding: '1.25rem', background: '#16a34a', color: 'white', borderRadius: 10, textDecoration: 'none', textAlign: 'center', fontWeight: 700 }}
          >
            🏆 Match classé
          </Link>
          <Link
            href="/match?mode=unranked"
            style={{ flex: 1, minWidth: 160, padding: '1.25rem', background: '#2563eb', color: 'white', borderRadius: 10, textDecoration: 'none', textAlign: 'center', fontWeight: 700 }}
          >
            📚 Match non classé
          </Link>
        </div>
      </section>

      <section style={{ background: 'white', borderRadius: 12, padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Statistiques</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
          <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: 8 }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>—</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>ELO</div>
          </div>
          <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: 8 }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563eb' }}>—</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Victoires</div>
          </div>
          <div style={{ padding: '1rem', background: '#fefce8', borderRadius: 8 }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ca8a04' }}>50</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Points DeenUp</div>
          </div>
        </div>
      </section>
    </main>
  );
}
