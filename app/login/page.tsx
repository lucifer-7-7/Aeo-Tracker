'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

const login = async () => {
  setLoading(true)
  
  // Get origin safely (works in both browser and SSR)
  const origin = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/after-login`,
    },
  })
  setLoading(false)
  if (error) alert(error.message)
  else alert('Check your email for the login link')
}

  return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md px-6">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #2383e2 0%, #1a6dc4 100%)', boxShadow: 'var(--shadow-lg)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            AEO Tracker
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            Track your visibility across AI search engines
          </p>
        </div>

        {/* Login Card */}
        <div className="notion-card" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Sign in to continue
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              We'll send you a magic link to your email
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                Email address
              </label>
              <input
                className="notion-input w-full"
                placeholder="name@company.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email && !loading) {
                    login()
                  }
                }}
              />
            </div>

            <button
              onClick={login}
              disabled={!email || loading}
              className="btn-primary w-full"
              style={{ padding: '0.625rem 1rem' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-pulse">●</span>
                  Sending...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  Send Magic Link
                </span>
              )}
            </button>
          </div>

          {/* Info */}
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            background: 'var(--bg-tertiary)', 
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            lineHeight: 1.6
          }}>
            <div style={{ marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
              💡 <strong>Magic Link Login</strong>
            </div>
            Click the link in your email to sign in securely without a password.
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8" style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          Secure authentication powered by Supabase
        </div>
      </div>
    </div>
  )
}
