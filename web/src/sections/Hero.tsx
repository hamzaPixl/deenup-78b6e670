import { Button } from '@/components/Button';
import { LANDING_CONTENT } from '@/lib/content';

const { hero } = LANDING_CONTENT;

/**
 * Hero — above-the-fold section.
 *
 * Layout:  centered, single-column (mobile-first).
 * Design:  deep-navy gradient background, accent-green radial glow,
 *          gold accent glow top-right.
 * A11y:    <section> has aria-label, headline is <h1>, decorative
 *          overlays are aria-hidden.
 * Animation: CSS keyframe on load (no JS needed for above-the-fold).
 */
export function Hero() {
  return (
    <section
      aria-label="Introduction à DeenUp"
      style={{
        background:
          'linear-gradient(160deg, var(--color-primary-dark) 0%, var(--color-primary) 55%, var(--color-primary-light) 100%)',
        color: 'var(--color-foreground-inverted)',
        paddingBlock: 'clamp(5rem, 12vw, 9rem)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Decorative radial glows ─────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(ellipse at 15% 85%, rgba(22,163,74,0.18) 0%, transparent 55%),' +
            'radial-gradient(ellipse at 85% 10%, rgba(212,160,23,0.12) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Subtle geometric pattern ────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 40px)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="container"
        style={{ position: 'relative', textAlign: 'center' }}
      >
        {/* ── Badge ───────────────────────────────────────────────── */}
        <div
          className="animate-fade-in"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: 'rgba(22,163,74,0.15)',
            border: '1px solid rgba(22,163,74,0.4)',
            borderRadius: 'var(--radius-full)',
            padding: '0.4rem 1.125rem',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--color-accent-light)',
            marginBottom: 'var(--space-8)',
            letterSpacing: '0.02em',
          }}
        >
          {hero.badge}
        </div>

        {/* ── Headline ─────────────────────────────────────────────── */}
        <h1
          className="animate-slide-up"
          style={{
            fontSize: 'clamp(2.125rem, 5.5vw, 3.75rem)',
            fontWeight: 'var(--font-extrabold)',
            lineHeight: 1.15,
            maxWidth: '820px',
            margin: '0 auto var(--space-6)',
            whiteSpace: 'pre-line',
            textWrap: 'balance',
          }}
        >
          {hero.headline}
        </h1>

        {/* ── Subheadline ──────────────────────────────────────────── */}
        <p
          className="animate-slide-up"
          style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
            color: 'rgba(255,255,255,0.78)',
            lineHeight: 'var(--leading-relaxed)',
            maxWidth: '640px',
            margin: '0 auto var(--space-10)',
            animationDelay: '120ms',
            textWrap: 'pretty',
          }}
        >
          {hero.subheadline}
        </p>

        {/* ── CTA buttons ──────────────────────────────────────────── */}
        <div
          className="animate-fade-in"
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            justifyContent: 'center',
            flexWrap: 'wrap',
            animationDelay: '240ms',
          }}
        >
          <Button href={hero.primaryCta.href} variant="primary" size="lg">
            {hero.primaryCta.label}
          </Button>
          <Button href={hero.secondaryCta.href} variant="secondary" size="lg">
            {hero.secondaryCta.label}
          </Button>
        </div>

        {/* ── Social proof ─────────────────────────────────────────── */}
        <p
          className="animate-fade-in"
          style={{
            marginTop: 'var(--space-10)',
            fontSize: 'var(--text-sm)',
            color: 'rgba(255,255,255,0.48)',
            animationDelay: '360ms',
            letterSpacing: '0.01em',
          }}
        >
          ✓&nbsp;Gratuit&nbsp; · &nbsp;✓&nbsp;Sans publicité&nbsp; · &nbsp;✓&nbsp;Questions vérifiées par des théologiens
        </p>
      </div>
    </section>
  );
}
