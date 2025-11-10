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
