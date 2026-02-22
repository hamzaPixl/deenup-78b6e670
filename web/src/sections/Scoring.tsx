'use client';

import { LANDING_CONTENT } from '@/lib/content';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const { scoring } = LANDING_CONTENT;

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  accent: {
    bg: 'rgba(22,163,74,0.08)',
    text: 'var(--color-accent-dark)',
    border: 'rgba(22,163,74,0.3)',
  },
  gold: {
    bg: 'rgba(212,160,23,0.08)',
    text: 'var(--color-gold-dark)',
    border: 'rgba(212,160,23,0.3)',
  },
  primary: {
    bg: 'rgba(26,26,46,0.06)',
    text: 'var(--color-primary)',
    border: 'rgba(26,26,46,0.2)',
  },
};

/**
 * Scoring — explains the point/time system.
 *
 * Layout:  3 tier cards in a responsive grid, then formula box.
 * Design:  white background; tier cards use color-coded borders and backgrounds.
 * A11y:    tier grid is a <dl> (definition list of level → points + time);
 *          formula box has aria-label.
 * Animation: scroll-triggered tier cards slide-up with stagger.
 */
export function Scoring() {
  const { ref: sectionRef, isVisible: sectionVisible } = useScrollReveal<HTMLElement>();
  const { ref: formulaRef, isVisible: formulaVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section
      ref={sectionRef}
      className="section"
      aria-label="Système de score"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
          <span className="section-label">{scoring.label}</span>
          <h2 className="section-title">{scoring.headline}</h2>
          <p className="section-subtitle" style={{ maxWidth: 560, margin: '0 auto' }}>
            {scoring.subheadline}
          </p>
        </div>

        {/* Tier cards */}
        <dl
          aria-label="Niveaux de difficulté et points"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-6)',
            marginBottom: 'var(--space-12)',
            margin: '0 0 var(--space-12)',
          }}
        >
          {scoring.tiers.map((tier, index) => {
            const colors = tierColors[tier.color] ?? tierColors.primary;
            return (
              <div
                key={tier.level}
                style={{
                  background: colors.bg,
                  border: `2px solid ${colors.border}`,
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-8)',
                  textAlign: 'center',
                  opacity: sectionVisible ? 1 : 0,
                  transform: sectionVisible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.5s ease ${index * 120}ms, transform 0.5s ease ${index * 120}ms`,
                }}
              >
                <div
                  role="img"
                  aria-hidden="true"
                  style={{ fontSize: '2rem', marginBottom: 'var(--space-3)', lineHeight: 1 }}
                >
                  {tier.icon}
                </div>

                <dt
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-semibold)',
                    color: colors.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  {tier.level}
                </dt>

                <dd
                  style={{
                    fontSize: 'var(--text-4xl)',
                    fontWeight: 'var(--font-extrabold)',
                    color: colors.text,
                    lineHeight: 1,
                    marginBottom: 'var(--space-2)',
                    margin: '0 0 var(--space-2)',
                  }}
                >
                  <span className="tabular-nums">{tier.points}</span>
                  <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-normal)' }}>
                    {' '}pts
                  </span>
                </dd>

                <dd
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-foreground-muted)',
                    margin: 0,
                  }}
                >
                  ⏱ {tier.time}
                </dd>
              </div>
            );
          })}
        </dl>

        {/* Formula box */}
        <div
          ref={formulaRef}
          role="region"
          aria-label="Formule de calcul du score"
          style={{
            background: 'var(--color-primary)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            textAlign: 'center',
            maxWidth: 660,
            margin: '0 auto',
            opacity: formulaVisible ? 1 : 0,
            transform: formulaVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s',
          }}
        >
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-bold)',
              color: 'var(--color-accent-light)',
              margin: '0 0 var(--space-4)',
            }}
          >
            {scoring.formula}
          </p>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 'var(--leading-relaxed)',
              margin: 0,
            }}
          >
            {scoring.formulaNote}
          </p>
        </div>
      </div>
    </section>
  );
}
