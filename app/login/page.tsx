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
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/after-login`,
    },
  })
  setLoading(false)
  if (error) alert(error.message)
  else alert('Check your email for the login link')
}

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="p-6 bg-gray-900 rounded-2xl w-80 space-y-3">
        <div className="text-lg font-semibold text-center">AEO Tracker</div>

        <input
          className="w-full p-2 rounded bg-gray-800 outline-none"
          placeholder="email@site.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={login}
          disabled={!email || loading}
          className="w-full p-2 rounded bg-blue-600 disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </div>
    </div>
  )
}
