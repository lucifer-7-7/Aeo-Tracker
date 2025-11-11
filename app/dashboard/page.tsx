'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ThemeToggle from '@/components/ThemeToggle'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar
} from 'recharts'
import { seedDemoData, seedExistingKeywords } from './seedData'

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

  // Manual data management
  const [projects, setProjects] = useState<Array<{ id: string; domain: string; brand: string }>>([])
  const [projectKeywords, setProjectKeywords] = useState<Record<string, Array<{ id: string; keyword: string }>>>({})
  const [showAddProject, setShowAddProject] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [manageSectionOpen, setManageSectionOpen] = useState(true)
  
  // Website selector for viewing stats
  const [selectedWebsiteForStats, setSelectedWebsiteForStats] = useState<string | null>(null)
  
  // Welcome popup
  const [showWelcomePopup, setShowWelcomePopup] = useState(false)

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
    
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    
    setSeeded(true)
    
    // Reload projects and data to show the demo
    await loadProjects()
    await loadData()
    
    setLoading(false)
    
    // Scroll to top to see the demo data
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const generateDataForMyKeywords = async () => {
    setLoading(true)
    setError(null)
    
    // Generate data for the currently selected website only
    const { error } = await seedExistingKeywords(selectedWebsiteForStats || undefined)
    
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    
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
      recs.push(`[ALERT] Low visibility on: ${weakEngines.join(', ')}. Optimize content for these engines.`)
    }
    
    // Find best performing engine
    if (engines.length > 0) {
      const best = engines[engines.length - 1]
      recs.push(`[SUCCESS] Strongest performance on ${best[0]} (${best[1].toFixed(1)}%). Apply similar patterns to other engines.`)
    }
    
    // Find low performing keywords
    const weakKeywords = keywordData.filter(k => k.pct < 50).slice(0, 3)
    if (weakKeywords.length > 0) {
      recs.push(`[WARNING] Keywords requiring optimization: ${weakKeywords.map(k => k.keyword).join(', ')}`)
    }
    
    // Find keywords missing on specific engines
    keywordData.forEach(kw => {
      const missingEngines: string[] = []
      if (kw.ChatGPT === 0) missingEngines.push('ChatGPT')
      if (kw.Gemini === 0) missingEngines.push('Gemini')
      if (kw.Claude === 0) missingEngines.push('Claude')
      if (kw.Perplexity === 0) missingEngines.push('Perplexity')
      
      if (missingEngines.length >= 2) {
        recs.push(`[CRITICAL] Query "${kw.keyword}" absent from: ${missingEngines.join(', ')}`)
      }
    })
    
    // Overall health check
    const avgVisibility = keywordData.reduce((sum, k) => sum + k.pct, 0) / keywordData.length
    if (avgVisibility > 70) {
      recs.push(`[STATUS] Overall visibility index: ${avgVisibility.toFixed(1)}% — Performance nominal`)
    } else if (avgVisibility < 40) {
      recs.push(`[URGENT] Overall visibility index: ${avgVisibility.toFixed(1)}% — Immediate content optimization required`)
    }
    
    setRecommendations(recs.slice(0, 5)) // Limit to 5 recommendations
  }

  const loadProjects = async () => {
    const { data: projectsData, error: pErr } = await supabase
      .from('projects').select('id, domain, brand')
    if (pErr) { setError(pErr.message); return }
    
    setProjects(projectsData || []);
    
    // Auto-select first website if none selected
    if (projectsData && projectsData.length > 0 && !selectedWebsiteForStats) {
      setSelectedWebsiteForStats(projectsData[0].id);
    }
    
    // Load keywords for each project
    if (projectsData && projectsData.length > 0) {
      const kwMap: Record<string, Array<{ id: string; keyword: string }>> = {};
      for (const proj of projectsData) {
        const { data: kwData } = await supabase
          .from('keywords')
          .select('id, keyword')
          .eq('project_id', proj.id);
        kwMap[proj.id] = kwData || [];
      }
      setProjectKeywords(kwMap);
      console.log('Keywords loaded:', kwMap);
    }
  };

  const loadData = async () => {
    setLoading(true); setError(null)

    // Filter by selected website if one is chosen
    let projectIds: string[] = []
    if (selectedWebsiteForStats) {
      projectIds = [selectedWebsiteForStats]
    } else {
      const { data: projects, error: pErr } = await supabase
        .from('projects').select('id')
      if (pErr) { setError(pErr.message); setLoading(false); return }
      if (!projects?.length) { 
        // No projects - clear all stats
        setOverall(null)
        setPerEngine({})
        setTrend([])
        setKeywordRows([])
        setRecommendations([])
        setLoading(false)
        return 
      }
      projectIds = projects.map(p => p.id)
    }

    const { data: keywords, error: kErr } = await supabase
      .from('keywords').select('id, keyword')
      .in('project_id', projectIds)
    if (kErr) { setError(kErr.message); setLoading(false); return }
    if (!keywords?.length) { 
      // No keywords - clear all stats
      setOverall(null)
      setPerEngine({})
      setTrend([])
      setKeywordRows([])
      setRecommendations([])
      setLoading(false)
      return 
    }

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
  };

  const addProject = async () => {
    if (!newDomain.trim() || !newBrand.trim()) {
      setError('Domain and brand are required');
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('User not authenticated');
      return;
    }

    const { data, error: insertErr } = await supabase
      .from('projects')
      .insert({ 
        domain: newDomain.trim(), 
        brand: newBrand.trim(),
        user_id: user.id 
      })
      .select();

    if (insertErr) {
      setError(insertErr.message);
      return;
    }

    setNewDomain('');
    setNewBrand('');
    setShowAddProject(false);
    await loadProjects();
    setError(null);
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this website and all its keywords?')) {
      return;
    }

    setLoading(true);

    // First get all keywords for this project
    const { data: keywords } = await supabase
      .from('keywords')
      .select('id')
      .eq('project_id', projectId);

    // Delete all checks for these keywords
    if (keywords && keywords.length > 0) {
      await supabase
        .from('checks')
        .delete()
        .in('keyword_id', keywords.map(k => k.id));
    }

    // Delete all keywords
    await supabase
      .from('keywords')
      .delete()
      .eq('project_id', projectId);

    // Delete the project
    const { error: delErr } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (delErr) {
      setError(delErr.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    await loadProjects();
    await loadData();
  };

  const addKeyword = async (projectId: string) => {
    if (!newKeyword.trim()) {
      setError('Keyword is required');
      return;
    }

    const { error: insertErr } = await supabase
      .from('keywords')
      .insert({ project_id: projectId, keyword: newKeyword.trim() });

    if (insertErr) {
      setError(insertErr.message);
      return;
    }

    setNewKeyword('');
    setError(null);
    
    console.log('Keyword added to project:', projectId);
    console.log('Currently viewing:', selectedWebsiteForStats);
    
    // Reload projects to update keyword list
    await loadProjects();
    
    // Only reload data if we're viewing this project
    if (selectedWebsiteForStats === projectId) {
      await loadData();
    }
  };

  const deleteKeyword = async (keywordId: string) => {
    // Delete checks for this keyword first
    await supabase
      .from('checks')
      .delete()
      .eq('keyword_id', keywordId);

    // Delete the keyword
    const { error: delErr } = await supabase
      .from('keywords')
      .delete()
      .eq('id', keywordId);

    if (delErr) {
      setError(delErr.message);
      return;
    }

    await loadProjects();
    await loadData();
  }

  const cleanupOrphanedData = async () => {
    setLoading(true);
    
    // Get all valid project IDs
    const { data: projects } = await supabase
      .from('projects')
      .select('id');
    
    const validProjectIds = projects?.map(p => p.id) || [];

    if (validProjectIds.length === 0) {
      // No projects, delete all keywords and checks
      await supabase.from('checks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('keywords').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } else {
      // Delete keywords not belonging to any project
      const { data: allKeywords } = await supabase
        .from('keywords')
        .select('id, project_id');
      
      const orphanedKeywords = allKeywords?.filter(k => !validProjectIds.includes(k.project_id)) || [];
      
      if (orphanedKeywords.length > 0) {
        await supabase
          .from('checks')
          .delete()
          .in('keyword_id', orphanedKeywords.map(k => k.id));
        
        await supabase
          .from('keywords')
          .delete()
          .in('id', orphanedKeywords.map(k => k.id));
      }
    }

    setLoading(false);
    await loadData();
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
      await loadProjects()
      await cleanupOrphanedData()
      await loadData()
    }
    checkAuth()
  }, [router])

  // Reload data when selected website changes
  useEffect(() => {
    if (authChecked && selectedWebsiteForStats) {
      loadData()
    }
  }, [selectedWebsiteForStats])

  // Show welcome popup on first load if no projects
  useEffect(() => {
    if (authChecked && projects.length === 0) {
      const hasSeenWelcome = localStorage.getItem('aeo-tracker-welcome-seen')
      if (!hasSeenWelcome) {
        setShowWelcomePopup(true)
      }
    }
  }, [authChecked, projects.length])

  // Don't render until auth is checked
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'radial-gradient(circle at top right, rgba(0, 217, 255, 0.15) 0%, rgba(0, 217, 255, 0.05) 25%, transparent 50%), var(--bg-primary)' }}>
        <div className="text-center">
          <div className="neon-loader" style={{ margin: '0 auto 1.5rem' }}></div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#00D9FF', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace' }}>
            VERIFYING ACCESS...
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(circle at top right, rgba(0, 217, 255, 0.15) 0%, rgba(0, 217, 255, 0.05) 25%, transparent 50%), var(--bg-primary)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="page-header" style={{ fontSize: '20px', fontWeight: 600 }}>AEO TRACKER</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle fixed={false} />
            <a 
              href="/logout" 
              className="btn-secondary" 
              style={{ fontSize: '13px', padding: '0.375rem 0.75rem' }}
            >
              Logout
            </a>
          </div>
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
        </div>

        {/* Manual Data Management Section */}
        <div className="notion-card" style={{ padding: '1.5rem' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
            <div className="section-title">🎯 Manage Websites & Keywords</div>
            <button 
              onClick={() => setManageSectionOpen(!manageSectionOpen)}
              className="btn-secondary"
              style={{ fontSize: '13px', padding: '0.375rem 0.75rem' }}
            >
              {manageSectionOpen ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {manageSectionOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Add New Website */}
              <div>
                {!showAddProject ? (
                  <button 
                    onClick={() => setShowAddProject(true)}
                    className="btn-primary"
                    style={{ fontSize: '14px' }}
                  >
                    <span className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add New Website
                    </span>
                  </button>
                ) : (
                  <div style={{ 
                    background: 'var(--bg-tertiary)', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                      Add New Website
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input
                        type="text"
                        placeholder="Domain (e.g., example.com)"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        style={{
                          padding: '0.625rem',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '14px',
                          color: 'var(--text-primary)'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Brand Name (e.g., My Brand)"
                        value={newBrand}
                        onChange={(e) => setNewBrand(e.target.value)}
                        style={{
                          padding: '0.625rem',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '14px',
                          color: 'var(--text-primary)'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={addProject} className="btn-primary" style={{ fontSize: '13px' }}>
                          Add Website
                        </button>
                        <button 
                          onClick={() => { setShowAddProject(false); setNewDomain(''); setNewBrand(''); }}
                          className="btn-secondary"
                          style={{ fontSize: '13px' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Existing Websites & Keywords */}
              {projects.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {projects.map(project => (
                    <div 
                      key={project.id}
                      style={{
                        background: 'var(--bg-tertiary)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: selectedWebsiteForStats === project.id ? '2px solid #00D9FF' : '2px solid var(--border)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {project.brand}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                            {project.domain}
                          </div>
                          {selectedWebsiteForStats === project.id && (
                            <div style={{
                              marginTop: '0.35rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '2px',
                              background: 'rgba(0, 217, 255, 0.15)',
                              color: '#00D9FF',
                              fontSize: '11px',
                              fontWeight: 600,
                              letterSpacing: '0.3px'
                            }}>
                              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#00D9FF', display: 'inline-block' }} />
                              VIEWING
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteProject(project.id)}
                          style={{
                            padding: '0.375rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>

                      {/* Keywords */}
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          Keywords:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          {(projectKeywords[project.id] || []).map(kw => (
                            <div
                              key={kw.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.375rem 0.625rem',
                                background: 'var(--bg-secondary)',
                                borderRadius: '4px',
                                fontSize: '13px',
                                color: 'var(--text-primary)'
                              }}
                            >
                              {kw.keyword}
                              <button
                                onClick={() => deleteKeyword(kw.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '0',
                                  fontSize: '14px',
                                  lineHeight: '1'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        {/* Add Keyword */}
                        {selectedProjectId === project.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              placeholder="Enter keyword"
                              value={newKeyword}
                              onChange={(e) => setNewKeyword(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addKeyword(project.id)}
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                fontSize: '13px',
                                color: 'var(--text-primary)'
                              }}
                            />
                            <button
                              onClick={() => addKeyword(project.id)}
                              className="btn-primary"
                              style={{ fontSize: '13px', padding: '0.5rem 0.75rem' }}
                            >
                              Add
                            </button>
                            <button
                              onClick={() => { setSelectedProjectId(null); setNewKeyword(''); }}
                              className="btn-secondary"
                              style={{ fontSize: '13px', padding: '0.5rem 0.75rem' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedProjectId(project.id)}
                            style={{
                              padding: '0.5rem 0.75rem',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              fontSize: '13px',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}
                          >
                            + Add Keyword
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2.5rem 1rem', 
                  color: 'var(--text-tertiary)',
                  fontSize: '14px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🚀</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Ready to Track Your Visibility?
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    Click "Add New Website" above to get started
                  </div>
                  
                  {/* Demo Data Button */}
                  <div style={{ 
                    marginTop: '2rem', 
                    paddingTop: '2rem', 
                    borderTop: '1px dashed var(--border)',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--bg-secondary)',
                      padding: '0 1rem',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      or
                    </div>
                    <div style={{ 
                      fontSize: '15px', 
                      fontWeight: 600, 
                      color: 'var(--text-primary)', 
                      marginBottom: '0.5rem' 
                    }}>
                      Try it with sample data
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: 'var(--text-tertiary)',
                      marginBottom: '1rem'
                    }}>
                      Explore a sample dashboard with boAt earbuds tracking data
                    </div>
                    <button
                      onClick={seed}
                      disabled={loading}
                      style={{ 
                        fontSize: '14px', 
                        fontWeight: 600,
                        padding: '0.875rem 1.75rem',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)'
                        }
                      }}
                    >
                      {loading ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                          </svg>
                          LOADING DEMO...
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polygon points="10 8 16 12 10 16 10 8"></polygon>
                          </svg>
                          View Demo with boAt Audio
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Generate Stats Button */}
              {projects.length > 0 && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                  <button 
                    onClick={async () => {
                      await generateDataForMyKeywords();
                      await loadData();
                    }} 
                    disabled={loading || !selectedWebsiteForStats} 
                    className="btn-primary"
                    style={{ width: '100%', fontSize: '15px', padding: '0.75rem' }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-pulse">●</span>
                        Generating Stats...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        ✨ Generate Stats for {projects.find(p => p.id === selectedWebsiteForStats)?.brand || 'Website'}
                      </span>
                    )}
                  </button>
                  <div style={{ 
                    marginTop: '0.75rem', 
                    textAlign: 'center', 
                    fontSize: '13px', 
                    color: 'var(--text-tertiary)' 
                  }}>
                    This will create 14 days of tracking data for your keywords
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Website Selector for Stats */}
        {projects.length > 0 && (
          <div className="notion-card" style={{ padding: '1rem 1.5rem' }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  📊 Viewing Stats For:
                </span>
                <select
                  value={selectedWebsiteForStats || ''}
                  onChange={(e) => {
                    setSelectedWebsiteForStats(e.target.value);
                  }}
                  style={{
                    padding: '0.5rem 2rem 0.5rem 0.75rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    minWidth: '200px'
                  }}
                >
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>
                      {proj.brand} ({proj.domain})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: (projectKeywords[selectedWebsiteForStats || '']?.length || 0) > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                {projectKeywords[selectedWebsiteForStats || '']?.length || 0} keywords tracked
              </div>
            </div>
          </div>
        )}

        {/* No Keywords Message */}
        {projects.length > 0 && selectedWebsiteForStats && (projectKeywords[selectedWebsiteForStats]?.length || 0) === 0 && (
          <div className="notion-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📊</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              No Keywords for {projects.find(p => p.id === selectedWebsiteForStats)?.brand || 'This Website'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
              Scroll up to the "Manage Websites & Keywords" section and add keywords to this website
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: 'var(--text-secondary)', 
              background: 'var(--bg-tertiary)', 
              padding: '0.75rem', 
              borderRadius: '6px',
              display: 'inline-block'
            }}>
              💡 Make sure you're adding keywords to <strong>{projects.find(p => p.id === selectedWebsiteForStats)?.brand}</strong>, not a different website
            </div>
          </div>
        )}

        {/* Stats Section - Only show if there are projects and keywords */}
        {projects.length > 0 && selectedWebsiteForStats && (projectKeywords[selectedWebsiteForStats]?.length || 0) > 0 && (
          <>
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
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 700, 
              color: '#00D9FF',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              marginBottom: '1rem',
              fontFamily: 'monospace'
            }}>
              ANALYSIS OUTPUT
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recommendations.map((rec, idx) => {
                const isAlert = rec.startsWith('[ALERT]') || rec.startsWith('[WARNING]')
                const isCritical = rec.startsWith('[CRITICAL]') || rec.startsWith('[URGENT]')
                const isSuccess = rec.startsWith('[SUCCESS]') || rec.startsWith('[STATUS]')
                
                let statusColor = '#00D9FF'
                let bgColor = 'rgba(0, 217, 255, 0.05)'
                let borderColor = 'rgba(0, 217, 255, 0.3)'
                
                if (isCritical) {
                  statusColor = '#ff0055'
                  bgColor = 'rgba(255, 0, 85, 0.05)'
                  borderColor = 'rgba(255, 0, 85, 0.3)'
                } else if (isAlert) {
                  statusColor = '#ffaa00'
                  bgColor = 'rgba(255, 170, 0, 0.05)'
                  borderColor = 'rgba(255, 170, 0, 0.3)'
                } else if (isSuccess) {
                  statusColor = '#00ff88'
                  bgColor = 'rgba(0, 255, 136, 0.05)'
                  borderColor = 'rgba(0, 255, 136, 0.3)'
                }
                
                return (
                  <div key={idx} style={{ 
                    padding: '0.75rem 1rem', 
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderLeft: `3px solid ${statusColor}`,
                    borderRadius: '0px',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                    fontFamily: 'monospace',
                    letterSpacing: '0.2px'
                  }}>
                    {rec}
                  </div>
                )
              })}
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
                <Line type="monotone" dataKey="overall" name="Overall" stroke="#00D9FF" strokeWidth={3} dot={theme === 'light' ? { r: 4, fill: '#00D9FF', stroke: '#111', strokeWidth: 1 } : { r: 4 }} />
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
                <Bar dataKey="value" fill="#00D9FF" radius={[0, 0, 0, 0]} />
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
                      No data available. Add keywords to your website and click "Generate Stats" button to create tracking data.
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
              💡 <span style={{ color: 'var(--text-secondary)' }}>Tip:</span> Select a website from the dropdown, then add keywords and click "Generate Stats" to see tracking data.
            </div>
          </>
        )}
      </div>

      {/* Welcome Popup Modal */}
      {showWelcomePopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#00D9FF', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                WELCOME TO AEO TRACKER
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                Track your website visibility across AI search engines
              </p>
            </div>

            <div style={{
              background: 'var(--bg-tertiary)',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                🚀 Get Started in 3 Simple Steps:
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ 
                    minWidth: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    background: '#00D9FF', 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600
                  }}>1</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Add Your Website
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      Click "Add New Website" and enter your domain
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ 
                    minWidth: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    background: '#00D9FF', 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600
                  }}>2</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Add Keywords
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      Add the keywords you want to track for your website
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ 
                    minWidth: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    background: '#00D9FF', 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600
                  }}>3</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Generate Stats
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      Click "Generate Stats" to create 14 days of tracking data
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowWelcomePopup(false);
                localStorage.setItem('aeo-tracker-welcome-seen', 'true');
              }}
              className="btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '15px' }}
            >
              Got It! Let's Start Tracking
            </button>
          </div>
        </div>
      )}
    </div>
  )
}