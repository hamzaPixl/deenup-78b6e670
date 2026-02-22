'use client';

import { LANDING_CONTENT } from '@/lib/content';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const { features } = LANDING_CONTENT;

/**
 * Features — four differentiator cards.
 *
 * Layout:  auto-fit grid, minmax(260px, 1fr).
 * Design:  white background; highlighted card has accent-green top border
 *          and a "Notre différenciateur" badge.
 * A11y:    list semantics via <ul>/<li>; highlight badge has role="note".
 * Animation: scroll-triggered staggered fade-slide-up.
 */
export function Features() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      className="section"
      aria-label="Pourquoi DeenUp"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
          <span className="section-label">{features.label}</span>
          <h2 className="section-title">{features.headline}</h2>
          <p className="section-subtitle" style={{ maxWidth: 560, margin: '0 auto' }}>
            {features.subheadline}
          </p>
        </div>

        {/* Feature grid */}
        <ul
          aria-label="Fonctionnalités de DeenUp"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-6)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {features.items.map((item, index) => (
            <li
              key={item.title}
              className="card"
              style={{
                padding: 'var(--space-8)',
                borderTop: item.highlight
                  ? '3px solid var(--color-accent)'
                  : '3px solid transparent',
                position: 'relative',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms`,
              }}
            >
              {/* Highlight badge */}
              {'highlightLabel' in item && item.highlightLabel && (
                <div
                  role="note"
                  aria-label={`Mise en avant : ${item.highlightLabel}`}
                  style={{
                    position: 'absolute',
                    top: '-1px',
                    right: 'var(--space-6)',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-semibold)',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.highlightLabel}
                </div>
              )}

              {/* Icon */}
              <div
                role="img"
                aria-label={item.title}
                style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)', lineHeight: 1 }}
              >
                {item.icon}
              </div>

              <h3
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-bold)',
                  color: 'var(--color-primary)',
                  margin: '0 0 var(--space-3)',
                }}
              >
                {item.title}
              </h3>

              <p
                style={{
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-foreground-muted)',
                  lineHeight: 'var(--leading-relaxed)',
                  margin: 0,
                }}
              >
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
