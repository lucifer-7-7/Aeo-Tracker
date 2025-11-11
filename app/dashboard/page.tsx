'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar
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
  const [trend, setTrend] = useState<Array<{ date: string; overall: number; ChatGPT: number; Gemini: number; Claude: number; Perplexity: number }>>([])
  const [keywordRows, setKeywordRows] = useState<Array<{ keyword: string; pct: number; ChatGPT: number; Gemini: number; Claude: number; Perplexity: number }>>([])
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Track theme from the html[data-theme] attribute so charts can adapt
  useEffect(() => {
    const apply = () => {
      const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
      setTheme(t)
    }
    apply()
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          apply()
        }
      }
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

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

  const generateRecommendations = (
    keywordData: Array<{ keyword: string; pct: number; ChatGPT: number; Gemini: number; Claude: number; Perplexity: number }>,
    engineData: Record<string, number>
  ) => {
    const recs: string[] = []
    
    // Find missing/low engines
    const engines = Object.entries(engineData).sort((a, b) => a[1] - b[1])
    const weakEngines = engines.filter(([_, pct]) => pct < 50).map(([name]) => name)
    
    if (weakEngines.length > 0) {
      recs.push(`⚠️ Low visibility on: ${weakEngines.join(', ')}. Consider optimizing content for these AI engines.`)
    }
    
    // Find best performing engine
    if (engines.length > 0) {
      const best = engines[engines.length - 1]
      recs.push(`✅ Strongest performance on ${best[0]} (${best[1]}%). Use similar strategies for other engines.`)
    }
    
    // Find low performing keywords
    const weakKeywords = keywordData.filter(k => k.pct < 50).slice(0, 3)
    if (weakKeywords.length > 0) {
      recs.push(`📉 These keywords need improvement: ${weakKeywords.map(k => k.keyword).join(', ')}`)
    }
    
    // Find keywords missing on specific engines
    keywordData.forEach(kw => {
      const missingEngines: string[] = []
      if (kw.ChatGPT === 0) missingEngines.push('ChatGPT')
      if (kw.Gemini === 0) missingEngines.push('Gemini')
      if (kw.Claude === 0) missingEngines.push('Claude')
      if (kw.Perplexity === 0) missingEngines.push('Perplexity')
      
      if (missingEngines.length >= 2) {
        recs.push(`🎯 "${kw.keyword}" is missing on: ${missingEngines.join(', ')}`)
      }
    })
    
    // Overall health check
    const avgVisibility = keywordData.reduce((sum, k) => sum + k.pct, 0) / keywordData.length
    if (avgVisibility > 70) {
      recs.push(`🌟 Great job! Your overall visibility is strong at ${avgVisibility.toFixed(0)}%`)
    } else if (avgVisibility < 40) {
      recs.push(`🔔 Action needed: Overall visibility is low (${avgVisibility.toFixed(0)}%). Focus on content optimization.`)
    }
    
    setRecommendations(recs.slice(0, 5)) // Limit to 5 recommendations
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

    // Overall
    const overallPct = Math.round((arr.filter(c => c.presence).length / arr.length) * 1000) / 10
    setOverall(overallPct)

    // Per engine
    const engines: Record<string, { yes: number; tot: number }> = {}
    for (const c of arr) {
      engines[c.engine] ??= { yes: 0, tot: 0 }
      engines[c.engine].tot += 1
      if (c.presence) engines[c.engine].yes += 1
    }
    const per: Record<string, number> = {}
    Object.entries(engines).forEach(([e, v]) => { per[e] = Math.round((v.yes / v.tot) * 1000) / 10 })
    setPerEngine(per)

    // Daily trend with all engines
    const byDay: Record<string, Record<string, { yes: number; tot: number }>> = {}
    for (const c of arr) {
      const key = new Date(c.timestamp).toISOString().slice(0, 10)
      byDay[key] ??= {}
      byDay[key][c.engine] ??= { yes: 0, tot: 0 }
      byDay[key][c.engine].tot += 1
      if (c.presence) byDay[key][c.engine].yes += 1
    }
    
    const trendRows = Object.keys(byDay).sort().map(day => {
      const dayData = byDay[day]
      const allChecks = Object.values(dayData).reduce((sum, v) => sum + v.tot, 0)
      const allPresence = Object.values(dayData).reduce((sum, v) => sum + v.yes, 0)
      
      return {
        date: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        overall: Math.round((allPresence / allChecks) * 1000) / 10,
        ChatGPT: dayData['ChatGPT'] ? Math.round((dayData['ChatGPT'].yes / dayData['ChatGPT'].tot) * 1000) / 10 : 0,
        Gemini: dayData['Gemini'] ? Math.round((dayData['Gemini'].yes / dayData['Gemini'].tot) * 1000) / 10 : 0,
        Claude: dayData['Claude'] ? Math.round((dayData['Claude'].yes / dayData['Claude'].tot) * 1000) / 10 : 0,
        Perplexity: dayData['Perplexity'] ? Math.round((dayData['Perplexity'].yes / dayData['Perplexity'].tot) * 1000) / 10 : 0,
      }
    })
    setTrend(trendRows)

    // Keyword breakdown by engine
    const kwMap = new Map(keywords.map(k => [k.id, k.keyword]))
    const byKw: Record<string, Record<string, { yes: number; tot: number }>> = {}
    for (const c of arr) {
      const kwName = kwMap.get(c.keyword_id) ?? 'Unknown'
      byKw[kwName] ??= {}
      byKw[kwName][c.engine] ??= { yes: 0, tot: 0 }
      byKw[kwName][c.engine].tot += 1
      if (c.presence) byKw[kwName][c.engine].yes += 1
    }
    
    const kwRows = Object.entries(byKw)
      .map(([keyword, engines]) => {
        const allChecks = Object.values(engines).reduce((sum, v) => sum + v.tot, 0)
        const allPresence = Object.values(engines).reduce((sum, v) => sum + v.yes, 0)
        
        return {
          keyword,
          pct: Math.round((allPresence / allChecks) * 1000) / 10,
          ChatGPT: engines['ChatGPT'] ? Math.round((engines['ChatGPT'].yes / engines['ChatGPT'].tot) * 100) : 0,
          Gemini: engines['Gemini'] ? Math.round((engines['Gemini'].yes / engines['Gemini'].tot) * 100) : 0,
          Claude: engines['Claude'] ? Math.round((engines['Claude'].yes / engines['Claude'].tot) * 100) : 0,
          Perplexity: engines['Perplexity'] ? Math.round((engines['Perplexity'].yes / engines['Perplexity'].tot) * 100) : 0,
        }
      })
      .sort((a, b) => b.pct - a.pct)
    setKeywordRows(kwRows)

    // Generate recommendations
    generateRecommendations(kwRows, per)

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
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="stats-card">
            <div className="metric-label">Overall Visibility</div>
            <div className="metric-value">{overall ?? '—'}%</div>
            <div style={{ marginTop: '0.5rem', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Last 14 days
            </div>
          </div>
          {Object.entries(perEngine).map(([engine, pct]) => (
            <div key={engine} className="stats-card">
              <div className="metric-label">{engine}</div>
              <div className="metric-value">{pct}%</div>
              <div style={{ marginTop: '0.5rem', fontSize: '12px', color: pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444' }}>
                {pct >= 70 ? '🟢 Strong' : pct >= 40 ? '🟡 Moderate' : '🔴 Weak'}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="notion-card" style={{ padding: '1.5rem' }}>
            <div className="section-title">💡 AI-Powered Recommendations</div>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recommendations.map((rec, idx) => (
                <div key={idx} style={{ 
                  padding: '0.75rem', 
                  background: 'var(--bg-tertiary)', 
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5'
                }}>
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trend Chart - Multi-Engine */}
        <div className="chart-container">
          <div className="section-title">Visibility Trends (Last 14 Days)</div>
          <div className="w-full" style={{ height: 320, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'} />
                <XAxis 
                  dataKey="date" 
                  stroke={theme === 'light' ? '#111111' : 'rgba(255,255,255,0.4)'}
                  style={{ fontSize: '12px', fill: theme === 'light' ? '#111111' : undefined }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke={theme === 'light' ? '#111111' : 'rgba(255,255,255,0.4)'}
                  style={{ fontSize: '12px', fill: theme === 'light' ? '#111111' : undefined }}
                  label={{ value: 'Visibility %', angle: -90, position: 'insideLeft', style: { fill: theme === 'light' ? '#111111' : 'rgba(255,255,255,0.4)' } }}
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
                <Line type="monotone" dataKey="overall" name="Overall" stroke="#2383e2" strokeWidth={3} dot={theme === 'light' ? { r: 4, fill: '#2383e2', stroke: '#111', strokeWidth: 1 } : { r: 4 }} />
                <Line type="monotone" dataKey="ChatGPT" name="ChatGPT" stroke="#10b981" strokeWidth={2} strokeOpacity={0.2} dot={theme === 'light' ? { r: 3, fill: '#10b981', stroke: '#111', strokeWidth: 1 } : { r: 3 }} />
                <Line type="monotone" dataKey="Gemini" name="Gemini" stroke="#f59e0b" strokeWidth={2} strokeOpacity={0.2} dot={theme === 'light' ? { r: 3, fill: '#f59e0b', stroke: '#111', strokeWidth: 1 } : { r: 3 }} />
                <Line type="monotone" dataKey="Claude" name="Claude" stroke="#8b5cf6" strokeWidth={2} strokeOpacity={0.2} dot={theme === 'light' ? { r: 3, fill: '#8b5cf6', stroke: '#111', strokeWidth: 1 } : { r: 3 }} />
                <Line type="monotone" dataKey="Perplexity" name="Perplexity" stroke="#ec4899" strokeWidth={2} strokeOpacity={0.2} dot={theme === 'light' ? { r: 3, fill: '#ec4899', stroke: '#111', strokeWidth: 1 } : { r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engine Comparison Bar Chart */}
        <div className="chart-container">
          <div className="section-title">Engine Comparison</div>
          <div className="w-full" style={{ height: 280, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.entries(perEngine).map(([name, value]) => ({ name, value }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'} />
                <XAxis 
                  dataKey="name" 
                  stroke={theme === 'light' ? '#111111' : 'rgba(255,255,255,0.4)'}
                  style={{ fontSize: '12px', fill: theme === 'light' ? '#111111' : undefined }}
                />
                <YAxis 
                  domain={[0, 100]}
                  stroke={theme === 'light' ? '#111111' : 'rgba(255,255,255,0.4)'}
                  style={{ fontSize: '12px', fill: theme === 'light' ? '#111111' : undefined }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-tertiary)', 
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="value" fill="#2383e2" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Keywords Table with Engine Breakdown */}
        <div className="notion-card" style={{ padding: '1.5rem' }}>
          <div className="section-title">Keywords Performance by Engine</div>
          <div className="overflow-x-auto" style={{ marginTop: '1rem' }}>
            <table className="notion-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Overall</th>
                  <th>ChatGPT</th>
                  <th>Gemini</th>
                  <th>Claude</th>
                  <th>Perplexity</th>
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
                      <td><span style={{ color: r.ChatGPT >= 70 ? '#10b981' : r.ChatGPT >= 40 ? '#f59e0b' : '#ef4444' }}>{r.ChatGPT}%</span></td>
                      <td><span style={{ color: r.Gemini >= 70 ? '#10b981' : r.Gemini >= 40 ? '#f59e0b' : '#ef4444' }}>{r.Gemini}%</span></td>
                      <td><span style={{ color: r.Claude >= 70 ? '#10b981' : r.Claude >= 40 ? '#f59e0b' : '#ef4444' }}>{r.Claude}%</span></td>
                      <td><span style={{ color: r.Perplexity >= 70 ? '#10b981' : r.Perplexity >= 40 ? '#f59e0b' : '#ef4444' }}>{r.Perplexity}%</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
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
          💡 <span style={{ color: 'var(--text-secondary)' }}>Tip:</span> Click "Seed Demo Data" to generate 14 days of sample data. Use "Refresh" to reload after changes.
        </div>
      </div>
    </div>
  )
}