// web/src/app/admin/layout.tsx
// Admin panel layout with sidebar navigation.
// Auth gate is intentionally skipped for now — no login page exists yet.

import React from 'react';
import Link from 'next/link';

const navLinks = [
  { href: '/admin/questions', label: '📝 Questions' },
  { href: '/admin/review', label: '🔍 Review Queue' },
  { href: '/admin/reports', label: '🚨 Reports' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          background: '#1a1a2e',
          color: '#fff',
          padding: '24px 0',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '0 16px 24px', borderBottom: '1px solid #2d2d4e' }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#a8d8ea' }}>
            DeenUp Admin
          </h1>
        </div>
        <nav style={{ padding: '16px 0' }}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'block',
                padding: '10px 16px',
                color: '#ccc',
                textDecoration: 'none',
                borderRadius: 4,
                margin: '2px 8px',
                fontSize: 14,
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 32, background: '#f8f9fa', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
