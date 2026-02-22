'use client';

import { LANDING_CONTENT } from '@/lib/content';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const { howItWorks } = LANDING_CONTENT;

/**
 * HowItWorks — 3-step process section.
 *
 * Layout:  single-column on mobile, 3-column grid on md+.
 * Design:  muted surface background, card-per-step with accent step numbers.
 * A11y:    ordered list semantics via <ol>, each step is an <li>.
 * Animation: scroll-triggered slide-up per card with staggered delay.
 */
export function HowItWorks() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      className="section"
      aria-label="Comment ça marche"
      style={{ background: 'var(--color-surface-muted)' }}
    >
      <div className="container">
        {/* ── Header ────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
          <span className="section-label">{howItWorks.label}</span>
          <h2 className="section-title">{howItWorks.headline}</h2>
          <p className="section-subtitle" style={{ maxWidth: 520, margin: '0 auto' }}>
            {howItWorks.subheadline}
          </p>
        </div>

        {/* ── Steps ────────────────────────────────────────────── */}
        <ol
          aria-label="Étapes pour commencer"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-8)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            position: 'relative',
          }}
        >
          {howItWorks.steps.map((step, index) => (
            <li
              key={step.step}
              className="card"
              style={{
                padding: 'var(--space-8)',
                textAlign: 'center',
                position: 'relative',
                /* Scroll-reveal stagger */
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(28px)',
                transition: `opacity 0.5s ease ${index * 100}ms, transform 0.5s ease ${index * 100}ms`,
              }}
            >
              {/* Step badge */}
              <div
                aria-hidden="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2.25rem',
                  height: '2.25rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-bold)',
                  marginBottom: 'var(--space-5)',
                  letterSpacing: '0.05em',
                }}
              >
                {step.step}
              </div>

              {/* Icon */}
              <div
                role="img"
                aria-label={step.title}
                style={{
                  fontSize: '3rem',
                  marginBottom: 'var(--space-4)',
                  lineHeight: 1,
                }}
              >
                {step.icon}
              </div>

              <h3
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-bold)',
                  color: 'var(--color-primary)',
                  margin: '0 0 var(--space-3)',
                }}
              >
                {step.title}
              </h3>

              <p
                style={{
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-foreground-muted)',
                  lineHeight: 'var(--leading-relaxed)',
                  margin: 0,
                  textWrap: 'pretty',
                }}
              >
                {step.body}
              </p>

              {/* Connector arrow — desktop only, via CSS */}
              {index < howItWorks.steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className="step-arrow"
                  style={{
                    position: 'absolute',
                    right: '-1.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1.75rem',
                    color: 'var(--color-surface-border)',
                    lineHeight: 1,
                    pointerEvents: 'none',
                    /* Hidden on mobile — shown via CSS below */
                    display: 'none',
                  }}
                >
                  →
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
