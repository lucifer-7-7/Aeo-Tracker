'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AfterLogin() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')

      await supabase.rpc('ensure_profile')
      router.replace('/dashboard')
    }
    run()
  }, [router])

  return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #2383e2 0%, #1a6dc4 100%)', boxShadow: 'var(--shadow-lg)' }}>
          <svg className="animate-pulse" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Setting things up...
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
          You'll be redirected to the dashboard in a moment
        </p>
      </div>
    </div>
  )
}
