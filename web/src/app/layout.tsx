import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://deenup.app'),
  title: 'DeenUp — Quiz islamique compétitif',
  description:
    "DeenUp est la première plateforme de quiz islamique compétitif. Des questions vérifiées par des théologiens, un classement ELO, et des explications sourcées après chaque match.",
  keywords: [
    'quiz islamique',
    'quiz islamique compétitif',
    'classement ELO',
    'Coran',
    'Prophètes',
    'Islam',
    'sources vérifiées',
    'DeenUp',
  ],
  authors: [{ name: 'DeenUp' }],
  openGraph: {
    title: 'DeenUp — Quiz islamique compétitif',
    description:
      "Apprenez l'Islam en vous amusant. Défiez vos proches avec des questions vérifiées par des théologiens.",
    type: 'website',
    locale: 'fr_FR',
    siteName: 'DeenUp',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DeenUp — Quiz islamique compétitif',
    description:
      "Apprenez l'Islam en vous amusant. Défiez vos proches avec des questions vérifiées par des théologiens.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
