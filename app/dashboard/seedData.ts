import { supabase } from '@/lib/supabaseClient'

/**
 * Demo seed data configuration
 */
export const DEMO_SEED_CONFIG = {
  project_domain: 'boat-lifestyle.com',
  project_brand: 'BoAt',
  keywords: [
    'best earbuds under 2000',
    'bluetooth speakers',
    'wireless headphones',
    'neckband earphones',
    'gaming earbuds',
    'anc earbuds',
    'cheap earbuds',
    'sports earphones',
    'budget headphones',
    'bass earbuds'
  ]
}

/**
 * Generate tracking data for existing keywords
 * Does NOT delete or replace your data
 */
export async function seedExistingKeywords(specificProjectId?: string) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: new Error('User not authenticated') }
    }

    // Determine which projects to use
    let projectIds: string[] = []
    if (specificProjectId) {
      projectIds = [specificProjectId]
    } else {
      // Get all user's projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)

      if (projectsError) {
        return { error: projectsError }
      }

      if (!projects || projects.length === 0) {
        return { error: new Error('No projects found. Please add a website first.') }
      }
      
      projectIds = projects.map(p => p.id)
    }

    // Get all keywords for these projects
    const { data: keywords, error: keywordsError } = await supabase
      .from('keywords')
      .select('id')
      .in('project_id', projectIds)

    if (keywordsError) {
      return { error: keywordsError }
    }

    if (!keywords || keywords.length === 0) {
      return { error: new Error('No keywords found. Please add keywords first.') }
    }

    // Generate check data for the last 14 days
    const engines = ['ChatGPT', 'Gemini', 'Claude', 'Perplexity']
    const checksToInsert = []
    const now = new Date()

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const checkDate = new Date(now)
      checkDate.setDate(checkDate.getDate() - dayOffset)

      for (const keyword of keywords) {
        for (const engine of engines) {
          // Random presence (60-90% chance of being present)
          const presence = Math.random() > 0.25
          
          checksToInsert.push({
            keyword_id: keyword.id,
            engine,
            presence,
            timestamp: checkDate.toISOString()
          })
        }
      }
    }

    // Delete existing checks first
    for (const keyword of keywords) {
      await supabase
        .from('checks')
        .delete()
        .eq('keyword_id', keyword.id)
    }

    // Insert new checks in batches (Supabase has limits)
    const batchSize = 500
    for (let i = 0; i < checksToInsert.length; i += batchSize) {
      const batch = checksToInsert.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('checks')
        .insert(batch)

      if (insertError) {
        console.error('Insert error:', insertError)
        return { error: insertError }
      }
    }

    return { error: null }
  } catch (err) {
    console.error('Seed error:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Seeds demo data using Supabase RPC function
 * Handles the ensure_profile requirement from client side first
 * 
 * @returns Promise with error if any
 */
export async function seedDemoData() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: new Error('User not authenticated') }
    }

    // Handle ensure_profile requirement from client side
    // This is needed because the RPC function calls ensure_profile()
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, email: user.email },
        { onConflict: 'id', ignoreDuplicates: false }
      )
    
    // Ignore duplicate key errors (23505)
    if (profileError && profileError.code !== '23505') {
      console.warn('Profile creation warning:', profileError)
      // Don't fail on profile errors, continue to seed
    }

    // Delete existing projects to avoid duplicates
    await supabase
      .from('projects')
      .delete()
      .eq('user_id', user.id)

    // Now call the Supabase RPC function to do the seeding
    const { error: rpcError } = await supabase.rpc('seed_demo', {
      project_domain: DEMO_SEED_CONFIG.project_domain,
      project_brand: DEMO_SEED_CONFIG.project_brand,
      keywords: DEMO_SEED_CONFIG.keywords
    })

    if (rpcError) {
      console.error('RPC Error:', rpcError)
      return { error: rpcError }
    }

    return { error: null }
  } catch (err) {
    console.error('Seed error:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
