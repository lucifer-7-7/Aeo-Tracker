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

  return <div className="p-6">Setting things up…</div>
}
