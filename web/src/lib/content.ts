/**
 * Landing page content — French language (MVP launch)
 * All copy is culturally appropriate and uses respectful formal French (vous).
 */

export const LANDING_CONTENT = {
  // ─── Hero ────────────────────────────────────────────────────────────────
  hero: {
    headline: "Apprenez l'Islam en vous amusant.\nDéfiez vos proches.",
    subheadline:
      "DeenUp est la première plateforme de quiz islamique compétitif. Des questions vérifiées par des théologiens, un classement ELO, et des explications sourcées après chaque match.",
    primaryCta: { label: "S'inscrire gratuitement", href: "/signup" },
    secondaryCta: { label: "Se connecter", href: "/login" },
    badge: "🕌 Quiz islamique compétitif",
  },

  // ─── How It Works ─────────────────────────────────────────────────────────
  howItWorks: {
    label: "Comment ça marche",
    headline: "Trois étapes pour commencer",
    subheadline: "Lancez-vous en quelques secondes et progressez match après match.",
    steps: [
      {
        icon: "📖",
        step: "01",
        title: "Choisissez un thème",
        body:
          "Coran, Prophètes, Prophète Muhammad ﷺ — sélectionnez le sujet qui vous intéresse et lancez une partie.",
      },
      {
        icon: "⚔️",
        step: "02",
        title: "Affrontez un adversaire",
        body:
          "15 questions, 3 niveaux de difficulté, un chrono qui tourne. Répondez vite et bien pour marquer un maximum de points.",
      },
      {
        icon: "✅",
        step: "03",
        title: "Apprenez avec les corrections",
        body:
          "Après chaque match, retrouvez chaque question avec la bonne réponse, une explication détaillée et les sources islamiques vérifiées.",
      },
    ],
  },

  // ─── Features ─────────────────────────────────────────────────────────────
  features: {
    label: "Pourquoi DeenUp",
    headline: "Une plateforme pensée pour apprendre sérieusement",
    subheadline:
      "Sans se prendre au sérieux — et sans jamais sacrifier la rigueur théologique.",
    items: [
      {
        icon: "🏆",
        title: "Classement ELO compétitif",
        body:
          "Comme aux échecs, votre classement reflète votre vrai niveau. Affrontez des joueurs de votre force et progressez match après match.",
        highlight: false,
      },
      {
        icon: "📚",
        title: "Corrections sourcées après chaque match",
        body:
          "Chaque réponse est accompagnée d'une explication complète avec les références du Coran, des Hadiths et de la jurisprudence Malékite. On ne joue pas qu'à un quiz — on apprend vraiment.",
        highlight: true,
        highlightLabel: "Notre différenciateur",
      },
      {
        icon: "🌙",
        title: "8 thèmes de savoir islamique",
        body:
          "Du Coran à l'histoire islamique, en passant par la vie des Compagnons et la jurisprudence — un terrain de jeu immense pour votre curiosité.",
        highlight: false,
      },
      {
        icon: "⭐",
        title: "Points DeenUp et bonus en match",
        body:
          "Gagnez des points en jouant chaque jour. Utilisez-les pour débloquer du temps supplémentaire, des indices ou doubler vos points sur une question difficile.",
        highlight: false,
      },
    ],
  },

  // ─── Themes ───────────────────────────────────────────────────────────────
  themes: {
    label: "Les thèmes",
    headline: "Explorez nos thèmes",
    subheadline:
      "Trois domaines de savoir islamique pour commencer — et d'autres à venir.",
    cards: [
      {
        icon: "📖",
        name: "Coran",
        slug: "quran",
        isMvp: true,
        description:
          "Versets, contexte de révélation, interprétation (tafsir). Plongez au cœur du Livre sacré.",
      },
      {
        icon: "🕌",
        name: "Prophètes",
        slug: "prophets",
        isMvp: true,
        description:
          "De Adam à Issa, redécouvrez les récits des prophètes et les leçons qu'ils nous transmettent.",
      },
      {
        icon: "⭐",
        name: "Prophète Muhammad ﷺ",
        slug: "muhammad",
        isMvp: true,
        description:
          "La vie du Prophète ﷺ, sa Sira, ses enseignements et les hadiths qui guident notre quotidien.",
      },
      {
        icon: "⚖️",
        name: "Jurisprudence",
        slug: "jurisprudence",
        isMvp: false,
        description:
          "Les règles de la jurisprudence islamique selon l'école Malékite, validées par des imams qualifiés.",
        comingSoon: true,
      },
      {
        icon: "🏛️",
        name: "Histoire islamique",
        slug: "history",
        isMvp: false,
        description:
          "Les grandes dates et événements fondateurs de la civilisation islamique.",
        comingSoon: true,
      },
      {
        icon: "👤",
        name: "Compagnons du Prophète",
        slug: "companions",
        isMvp: false,
        description:
          "Biographies et récits des Sahaba, les compagnons qui ont transmis l'héritage prophétique.",
        comingSoon: true,
      },
    ],
    comingSoonLabel: "Bientôt disponible",
  },

  // ─── Scoring ──────────────────────────────────────────────────────────────
  scoring: {
    label: "Le système de score",
    headline: "Un score qui récompense la précision et la rapidité",
    subheadline:
      "Plus la question est difficile, plus elle rapporte. Et plus vous répondez vite, plus vous gagnez.",
    tiers: [
      {
        level: "Facile",
        points: 100,
        time: "15 s",
        color: "accent",
        icon: "🟢",
      },
      {
        level: "Moyen",
        points: 200,
        time: "20 s",
        color: "gold",
        icon: "🟡",
      },
      {
        level: "Avancé",
        points: 400,
        time: "30 s",
        color: "primary",
        icon: "🔴",
      },
    ],
    formula: "Score = Points de base × (Temps restant ÷ Temps total)",
    formulaNote:
      "Une réponse avancée en 5 secondes vaut bien plus qu'une réponse facile à la dernière seconde. C'est la combinaison de la connaissance et de la rapidité qui fait la différence.",
  },

  // ─── CTA Banner ───────────────────────────────────────────────────────────
  ctaBanner: {
    headline: "Prêt à tester vos connaissances ?",
    subheadline:
      "Rejoignez DeenUp et commencez votre premier match dès maintenant. C'est gratuit.",
    cta: { label: "Créer mon compte gratuitement", href: "/signup" },
  },

  // ─── Footer ───────────────────────────────────────────────────────────────
  footer: {
    appName: "🕌 DeenUp",
    description:
      "La plateforme de quiz islamique compétitif — apprendre, jouer, progresser.",
    tagline:
      "Des questions vérifiées. Des sources authentiques. Une communauté passionnée.",
    links: [
      { label: "S'inscrire", href: "/signup" },
      { label: "Se connecter", href: "/login" },
    ],
    copyright: "© 2025 DeenUp. Tous droits réservés.",
  },
} as const;

export type LandingContent = typeof LANDING_CONTENT;
