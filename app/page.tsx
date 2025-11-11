import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2383e2 0%, #1a6dc4 100%)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>AEO Tracker</span>
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
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6" style={{ background: 'linear-gradient(135deg, #2383e2 0%, #1a6dc4 100%)', boxShadow: 'var(--shadow-lg)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>

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
            <span style={{ 
              background: 'linear-gradient(135deg, #2383e2 0%, #1a6dc4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
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
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--bg-tertiary)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2383e2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Real-time Analytics
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Track your visibility metrics across multiple AI engines in real-time
              </p>
            </div>

            <div className="notion-card" style={{ padding: '1.5rem' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--bg-tertiary)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2383e2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Keyword Tracking
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Monitor keyword performance and optimize your content strategy
              </p>
            </div>

            <div className="notion-card" style={{ padding: '1.5rem' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--bg-tertiary)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2383e2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
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
