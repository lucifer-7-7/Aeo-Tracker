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
  return <div className="p-6">Signing out…</div>
}
