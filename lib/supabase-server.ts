import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

/**
 * Creates a server-side Supabase client for use in API routes.
 * This client verifies the user's session from the Authorization header.
 * 
 * IMPORTANT: This should ONLY be used in server-side code (API routes).
 * Never use this in client components - use lib/supabase.ts instead.
 */
export async function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // Get headers from the request
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  // Create a Supabase client
  // If Authorization header is provided, use it for authenticated requests
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      persistSession: false, // Don't persist session on server
    },
  })

  return supabase
}

/**
 * Gets the authenticated user from the server-side Supabase client.
 * Expects the Authorization header with Bearer token.
 * Returns null if user is not authenticated.
 */
export async function getServerUser() {
  try {
    const headersList = await headers()
    const authHeader = headersList.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting server user:', error)
    return null
  }
}

