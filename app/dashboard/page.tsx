'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { seedDemoData } from './seedData'

type Engine = 'ChatGPT' | 'Gemini' | 'Claude' | 'Perplexity'
type Check = { engine: Engine; presence: boolean; timestamp: string }
type CheckRow = Check & { keyword_id: string }

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const [overall, setOverall] = useState<number | null>(null)
  const [perEngine, setPerEngine] = useState<Record<string, number>>({})
  const [trend, setTrend] = useState<Array<{ day: string; overall: number }>>([])
  const [keywordRows, setKeywordRows] = useState<Array<{ keyword: string; pct: number }>>([])
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const seed = async () => {
    setLoading(true)
    setError(null)
    
    const { error } = await seedDemoData()
    
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    
    setSeeded(true)
    await loadData()
  }

  const loadData = async () => {
    setLoading(true); setError(null)

    const { data: projects, error: pErr } = await supabase
      .from('projects').select('id')
    if (pErr) { setError(pErr.message); setLoading(false); return }
    if (!projects?.length) { setLoading(false); return }

    const { data: keywords, error: kErr } = await supabase
      .from('keywords').select('id, keyword')
      .in('project_id', projects.map(p => p.id))
    if (kErr) { setError(kErr.message); setLoading(false); return }
    if (!keywords?.length) { setLoading(false); return }

    const since = new Date(); since.setDate(since.getDate() - 14)

    const { data: checks, error: cErr } = await supabase
      .from('checks')
      .select('engine,presence,timestamp,keyword_id')
      .in('keyword_id', keywords.map(k => k.id))
      .gte('timestamp', since.toISOString())
      .limit(20000)
    if (cErr) { setError(cErr.message); setLoading(false); return }

    const arr = (checks ?? []) as CheckRow[]
    if (arr.length === 0) {
      setOverall(0); setPerEngine({}); setTrend([]); setKeywordRows([]); setLoading(false); return
    }

    // overall
    const overallPct = Math.round((arr.filter(c => c.presence).length / arr.length) * 1000) / 10
    setOverall(overallPct)

    // per engine
    const engines: Record<string, { yes: number; tot: number }> = {}
    for (const c of arr) {
      engines[c.engine] ??= { yes: 0, tot: 0 }
      engines[c.engine].tot += 1
      if (c.presence) engines[c.engine].yes += 1
    }
    const per: Record<string, number> = {}
    Object.entries(engines).forEach(([e, v]) => { per[e] = Math.round((v.yes / v.tot) * 1000) / 10 })
    setPerEngine(per)

    // daily trend
    const byDay: Record<string, { yes: number; tot: number }> = {}
    for (const c of arr) {
      const key = new Date(c.timestamp).toISOString().slice(0, 10)
      byDay[key] ??= { yes: 0, tot: 0 }
      byDay[key].tot += 1
      if (c.presence) byDay[key].yes += 1
    }
    const trendRows = Object.keys(byDay).sort().map(day => ({
      day,
      overall: Math.round((byDay[day].yes / byDay[day].tot) * 1000) / 10,
    }))
    setTrend(trendRows)

    // keyword breakdown
    const kwMap = new Map(keywords.map(k => [k.id, k.keyword]))
    const byKw: Record<string, { yes: number; tot: number }> = {}
    for (const c of arr) {
      const kwName = kwMap.get(c.keyword_id) ?? 'Unknown'
      byKw[kwName] ??= { yes: 0, tot: 0 }
      byKw[kwName].tot += 1
      if (c.presence) byKw[kwName].yes += 1
    }
    const kwRows = Object.entries(byKw)
      .map(([keyword, v]) => ({ keyword, pct: Math.round((v.yes / v.tot) * 1000) / 10 }))
      .sort((a, b) => b.pct - a.pct)
    setKeywordRows(kwRows)

    setLoading(false)
  }

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }
      setAuthChecked(true)
      await loadData()
    }
    checkAuth()
  }, [router])

  // Don't render until auth is checked
  if (!authChecked) {
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
            Verifying access...
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
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
            <h1 className="page-header" style={{ fontSize: '20px', fontWeight: 600 }}>AEO Tracker</h1>
          </div>
          <a 
            href="/logout" 
            className="btn-secondary" 
            style={{ fontSize: '13px', padding: '0.375rem 0.75rem' }}
          >
            Logout
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Page Title & Actions */}
        <div className="space-y-4">
          <div>
            <h2 className="page-header">Dashboard</h2>
            <p style={{ color: 'var(--text-tertiary)', marginTop: '0.5rem', fontSize: '14px' }}>
              Track your visibility across AI search engines
            </p>
          </div>

          {error && (
            <div className="notion-card" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '0.75rem 1rem' }}>
              <div style={{ color: '#ef4444', fontSize: '14px' }}>⚠️ {error}</div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={seed} disabled={loading} className="btn-primary">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-pulse">●</span>
                  Working...
                </span>
              ) : seeded ? 'Reseed Demo Data' : 'Seed Demo Data'}
            </button>
            <button onClick={loadData} disabled={loading} className="btn-secondary">
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6m12-4a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                Refresh
              </span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stats-card">
            <div className="metric-label">Overall Visibility (14d)</div>
            <div className="metric-value">{overall ?? '—'}%</div>
            <div style={{ marginTop: '0.5rem', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Across all engines
            </div>
          </div>
          {Object.entries(perEngine).map(([engine, pct]) => (
            <div key={engine} className="stats-card">
              <div className="metric-label">{engine}</div>
              <div className="metric-value">{pct}%</div>
              <div style={{ marginTop: '0.5rem', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Visibility rate
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="chart-container">
          <div className="section-title">Trend (Last 14 Days)</div>
          <div className="w-full" style={{ height: 280, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis 
                  dataKey="day" 
                  stroke="rgba(255,255,255,0.4)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke="rgba(255,255,255,0.4)"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-tertiary)', 
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '1rem' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="overall" 
                  name="Overall %" 
                  stroke="#2383e2"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Keywords Table */}
        <div className="notion-card" style={{ padding: '1.5rem' }}>
          <div className="section-title">Keywords Performance</div>
          <div className="overflow-x-auto" style={{ marginTop: '1rem' }}>
            <table className="notion-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Visibility %</th>
                </tr>
              </thead>
              <tbody>
                {keywordRows.length > 0 ? (
                  keywordRows.map(r => (
                    <tr key={r.keyword}>
                      <td style={{ fontWeight: 500 }}>{r.keyword}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ 
                            width: '60px', 
                            height: '6px', 
                            background: 'var(--bg-tertiary)', 
                            borderRadius: '3px', 
                            overflow: 'hidden' 
                          }}>
                            <div style={{ 
                              width: `${r.pct}%`, 
                              height: '100%', 
                              background: r.pct >= 70 ? '#10b981' : r.pct >= 40 ? '#f59e0b' : '#ef4444',
                              borderRadius: '3px'
                            }} />
                          </div>
                          <span>{r.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                      No data available. Click "Seed Demo Data" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Tip */}
        <div style={{ 
          padding: '1rem', 
          background: 'var(--bg-secondary)', 
          borderRadius: '6px',
          border: '1px solid var(--border)',
          fontSize: '13px',
          color: 'var(--text-tertiary)'
        }}>
          💡 <span style={{ color: 'var(--text-secondary)' }}>Tip:</span> You can reseed to regenerate demo data and refresh to see the latest statistics.
        </div>
      </div>
    </div>
  )
}
