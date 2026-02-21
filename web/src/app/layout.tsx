import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DeenUp',
  description: 'Competitive Islamic Quiz Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
