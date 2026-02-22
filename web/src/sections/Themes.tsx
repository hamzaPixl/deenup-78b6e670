'use client';

import { LANDING_CONTENT } from '@/lib/content';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const { themes } = LANDING_CONTENT;

/**
 * Themes — grid of Islamic knowledge theme cards.
 *
 * Layout:  single column on mobile, auto-fill minmax(240px) on sm+.
 * Design:  muted surface background; MVP cards have accent-green badge,
 *          coming-soon cards are de-emphasised.
 * A11y:    list semantics; descriptive aria-label per card.
 * Animation: scroll-triggered staggered slide-up.
 */
export function Themes() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      className="section"
      aria-label="Thèmes disponibles"
      style={{ background: 'var(--color-surface-muted)' }}
    >
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
          <span className="section-label">{themes.label}</span>
          <h2 className="section-title">{themes.headline}</h2>
          <p className="section-subtitle" style={{ maxWidth: 520, margin: '0 auto' }}>
            {themes.subheadline}
          </p>
        </div>

        {/* Theme cards grid */}
        <ul
          aria-label="Thèmes de quiz islamique"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 'var(--space-6)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {themes.cards.map((card, index) => {
            const isComingSoon = 'comingSoon' in card && card.comingSoon;
            const cardOpacity = isVisible ? (isComingSoon ? 0.62 : 1) : 0;
            return (
              <li
                key={card.slug}
                className="card"
                aria-label={`${card.name}${isComingSoon ? ' — bientôt disponible' : ' — disponible'}`}
                style={{
                  padding: 'var(--space-6)',
                  opacity: cardOpacity,
                  position: 'relative',
                  transform: isVisible ? 'translateY(0)' : 'translateY(28px)',
                  transition: `opacity 0.5s ease ${index * 60}ms, transform 0.5s ease ${index * 60}ms`,
                }}
              >
                {/* Coming soon badge */}
                {isComingSoon && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 'var(--space-4)',
                      right: 'var(--space-4)',
                      background: 'var(--color-surface-muted)',
                      border: '1px solid var(--color-surface-border)',
                      color: 'var(--color-foreground-muted)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-semibold)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {themes.comingSoonLabel}
                  </span>
                )}

                {/* MVP / available badge */}
                {card.isMvp && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 'var(--space-4)',
                      right: 'var(--space-4)',
                      background: 'rgba(22,163,74,0.1)',
                      border: '1px solid rgba(22,163,74,0.3)',
                      color: 'var(--color-accent)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-semibold)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Disponible
                  </span>
                )}

                <div
                  role="img"
                  aria-label={card.name}
                  style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)', lineHeight: 1 }}
                >
                  {card.icon}
                </div>

                <h3
                  style={{
                    fontSize: 'var(--text-lg)',
                    fontWeight: 'var(--font-bold)',
                    color: 'var(--color-primary)',
                    margin: '0 0 var(--space-2)',
                  }}
                >
                  {card.name}
                </h3>

                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-foreground-muted)',
                    lineHeight: 'var(--leading-relaxed)',
                    margin: 0,
                  }}
                >
                  {card.description}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
