'use client';

import { Button } from '@/components/Button';
import { LANDING_CONTENT } from '@/lib/content';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const { ctaBanner } = LANDING_CONTENT;

/**
 * CtaBanner — final conversion section before footer.
 *
 * Layout:  centered single-column; vertically generous padding.
 * Design:  deep-navy gradient matching hero; green radial accent glow.
 * A11y:    section has aria-label; button is accessible anchor.
 * Animation: scroll-triggered fade-slide-up on content block.
 */
export function CtaBanner() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      aria-label="Inscrivez-vous à DeenUp"
      style={{
        background:
          'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
        paddingBlock: 'clamp(3rem, 8vw, 6rem)',
        textAlign: 'center',
        color: 'var(--color-foreground-inverted)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(ellipse at 50% 120%, rgba(22,163,74,0.15) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="container"
        style={{
          position: 'relative',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 3rem)',
            fontWeight: 'var(--font-extrabold)',
            lineHeight: 'var(--leading-tight)',
            margin: '0 0 var(--space-4)',
            textWrap: 'balance',
          }}
        >
          {ctaBanner.headline}
        </h2>

        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 'var(--leading-relaxed)',
            maxWidth: 520,
            margin: '0 auto var(--space-10)',
            textWrap: 'pretty',
          }}
        >
          {ctaBanner.subheadline}
        </p>

        <Button href={ctaBanner.cta.href} variant="primary" size="lg">
          {ctaBanner.cta.label}
        </Button>
      </div>
    </section>
  );
}
