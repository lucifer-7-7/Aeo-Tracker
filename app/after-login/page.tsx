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
    <div className="h-screen flex items-center justify-center" style={{ background: 'radial-gradient(circle at top right, rgba(0, 217, 255, 0.15) 0%, rgba(0, 217, 255, 0.05) 25%, transparent 50%), var(--bg-primary)' }}>
      <div className="text-center">
        <div className="neon-loader" style={{ margin: '0 auto 1.5rem' }}></div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#00D9FF', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace' }}>
          SETTING THINGS UP...
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
          Redirecting to dashboard
        </p>
      </div>
    </div>
  )
}
