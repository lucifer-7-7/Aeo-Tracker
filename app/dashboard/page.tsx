'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

type Engine = 'ChatGPT' | 'Gemini' | 'Claude' | 'Perplexity'
type Check = { engine: Engine; presence: boolean; timestamp: string }
type CheckRow = Check & { keyword_id: string }

export default function Dashboard() {
  const [loading, setLoading] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const [overall, setOverall] = useState<number | null>(null)
  const [perEngine, setPerEngine] = useState<Record<string, number>>({})
  const [trend, setTrend] = useState<Array<{ day: string; overall: number }>>([])
  const [keywordRows, setKeywordRows] = useState<Array<{ keyword: string; pct: number }>>([])
  const [error, setError] = useState<string | null>(null)

  const seed = async () => {
    setLoading(true); setError(null)
    const keywords = [
      'best earbuds under 2000','bluetooth speakers','wireless headphones',
      'neckband earphones','gaming earbuds','anc earbuds','cheap earbuds',
      'sports earphones','budget headphones','bass earbuds'
    ]
    const { error } = await supabase.rpc('seed_demo', {
      project_domain: 'boat-lifestyle.com',
      project_brand: 'BoAt',
      keywords
    })
    setLoading(false)
    if (error) { setError(error.message); return }
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

  useEffect(() => { loadData() }, [])

  return (
    <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
        <a href="/logout" className="text-sm underline text-gray-400 hover:text-white">Logout</a>

</div>
      <div className="text-2xl font-semibold">AEO Tracker — Dashboard</div>
      {error && <div className="text-red-400">Error: {error}</div>}

      <div className="flex items-center gap-3">
        <button onClick={seed} disabled={loading} className="px-4 py-2 rounded bg-blue-600 disabled:opacity-60">
          {loading ? 'Working…' : seeded ? 'Reseed Demo Data' : 'Seed Demo Data'}
        </button>
        <button onClick={loadData} disabled={loading} className="px-4 py-2 rounded bg-gray-700 disabled:opacity-60">
          Refresh
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-900 rounded-2xl">
          <div className="text-sm text-gray-400">Overall Visibility (14d)</div>
          <div className="text-3xl font-bold">{overall ?? '—'}%</div>
        </div>
        {Object.entries(perEngine).map(([engine, pct]) => (
          <div key={engine} className="p-4 bg-gray-900 rounded-2xl">
            <div className="text-sm text-gray-400">{engine}</div>
            <div className="text-3xl font-bold">{pct}%</div>
          </div>
        ))}
      </div>

            <div className="p-4 bg-gray-900 rounded-2xl min-w-0">
        <div className="text-sm text-gray-400 mb-2">7–14 day trend</div>
        <div className="w-full" style={{ height: 256, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">

            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="overall" name="Overall %" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-4 bg-gray-900 rounded-2xl">
        <div className="text-sm text-gray-400 mb-2">Keywords (last 14d)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="p-2">Keyword</th>
                <th className="p-2">Visibility %</th>
              </tr>
            </thead>
            <tbody>
              {keywordRows.map(r => (
                <tr key={r.keyword} className="border-t border-gray-800">
                  <td className="p-2">{r.keyword}</td>
                  <td className="p-2">{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-500">Tip: You can reseed to regenerate data.</div>
    </div>
  )
}
