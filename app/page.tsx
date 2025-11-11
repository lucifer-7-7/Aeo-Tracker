import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(circle at top right, rgba(0, 217, 255, 0.15) 0%, rgba(0, 217, 255, 0.05) 25%, transparent 50%), var(--bg-primary)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#00D9FF', textTransform: 'uppercase', letterSpacing: '1px' }}>AEO TRACKER</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle fixed={false} />
            <Link href="/login" className="btn-primary" style={{ fontSize: '13px', padding: '0.375rem 0.75rem' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title */}
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: 700, 
            color: 'var(--text-primary)', 
            letterSpacing: '-0.02em',
            marginBottom: '1rem',
            lineHeight: 1.2
          }}>
            Track Your Visibility in<br />
            <span style={{ color: '#00D9FF' }}>
              AI Search Engines
            </span>
          </h1>

          <p style={{ 
            fontSize: '18px', 
            color: 'var(--text-tertiary)', 
            maxWidth: '600px',
            margin: '0 auto 3rem',
            lineHeight: 1.6
          }}>
            Monitor your brand's presence across ChatGPT, Gemini, Claude, and Perplexity.
            Get real-time insights and track keyword performance.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Link href="/login" className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '15px' }}>
              <span className="flex items-center gap-2">
                Get Started
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="notion-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#00D9FF', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Real-time Analytics
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Track your visibility metrics across multiple AI engines in real-time
              </p>
            </div>

            <div className="notion-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#00D9FF', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Keyword Tracking
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Monitor keyword performance and optimize your content strategy
              </p>
            </div>

            <div className="notion-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#00D9FF', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Multi-Engine Support
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Track across ChatGPT, Gemini, Claude, and Perplexity simultaneously
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-6 text-center" style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          © 2024 AEO Tracker. Powered by Next.js and Supabase.
        </div>
      </div>
    </div>
  )
}
