import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DeenUp - Islamic Quiz',
  description: 'Competitive Islamic quiz platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        {children}
      </body>
    </html>
  );
}
