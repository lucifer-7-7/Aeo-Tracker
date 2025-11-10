'use client'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()
  async function run() {
    await supabase.auth.signOut()
    router.replace('/login')
  }
  run()
  return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #2383e2 0%, #1a6dc4 100%)', boxShadow: 'var(--shadow-lg)' }}>
          <svg className="animate-pulse" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Signing out...
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
          You'll be redirected to the login page
        </p>
      </div>
    </div>
  )
}
