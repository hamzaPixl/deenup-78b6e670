import Link from 'next/link';

export default function ProfilePage() {
  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/dashboard" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1.5rem' }}>
        ← Tableau de bord
      </Link>

      <div style={{ background: 'white', borderRadius: 12, padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'white', fontWeight: 700 }}>
            ?
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Joueur</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0' }}>Membre DeenUp</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: 8 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>—</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>ELO</div>
          </div>
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: 8 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>—%</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Taux de victoire</div>
          </div>
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: 8 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>0</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Parties jouées</div>
          </div>
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: 8 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>50</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Points DeenUp</div>
          </div>
        </div>
      </div>
    </main>
  );
}
