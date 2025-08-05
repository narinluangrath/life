import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gmail AI Assistant',
  description: 'Intelligent email management with AI suggestions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}