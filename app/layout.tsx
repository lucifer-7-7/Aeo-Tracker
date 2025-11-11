import './globals.css'
import ThemeToggle from '../components/ThemeToggle'

export const metadata = {
  title: 'AEO Tracker',
  description: 'Track visibility in AI search',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <ThemeToggle />
        {children}
      </body>
    </html>
  )
}