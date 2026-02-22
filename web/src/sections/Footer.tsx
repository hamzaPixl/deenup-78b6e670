import Link from 'next/link';
import { LANDING_CONTENT } from '@/lib/content';

const { footer } = LANDING_CONTENT;

/**
 * Footer — site-wide footer.
 *
 * Layout:  centered column on mobile; flex row with gap on md+.
 * Design:  darkest navy background, subtle top border.
 * A11y:    <footer> landmark; nav has aria-label; links have :focus-visible ring.
 */
export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--color-primary-dark)',
        color: 'rgba(255,255,255,0.7)',
        paddingBlock: 'var(--space-12)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-6)',
          textAlign: 'center',
        }}
      >
        {/* Brand */}
        <div>
          <p
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-extrabold)',
              color: 'var(--color-foreground-inverted)',
              margin: '0 0 var(--space-2)',
            }}
          >
            {footer.appName}
          </p>
          <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>{footer.description}</p>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'rgba(255,255,255,0.5)',
            fontStyle: 'italic',
            margin: 0,
            maxWidth: 480,
          }}
        >
          {footer.tagline}
        </p>

        {/* Navigation links */}
        <nav aria-label="Liens de navigation du pied de page">
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              gap: 'var(--space-6)',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {footer.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    textDecoration: 'none',
                    fontSize: 'var(--text-sm)',
                    transition: 'color var(--transition-fast)',
                    borderRadius: 'var(--radius-sm)',
                    outline: 'none',
                  }}
                  className="footer-link"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Copyright */}
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'rgba(255,255,255,0.35)',
            margin: 0,
          }}
        >
          {footer.copyright}
        </p>
      </div>
    </footer>
  );
}
