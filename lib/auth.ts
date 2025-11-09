import { supabase } from './supabase'

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting session:', error)
    return null
  }
  return session
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting user:', error)
    return null
  }
  return user
}

export async function signOut() {
  try {
    // Use local scope to clear local session without requiring server call
    // This prevents 403 errors when session is invalid/expired
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    
    if (error) {
      // Handle session-related errors gracefully
      // 403 errors or session missing errors mean user is already signed out
      if (
        error.message?.includes('session') || 
        error.message?.includes('Session') ||
        error.message?.includes('403') ||
        error.status === 403
      ) {
        // User is already signed out, clear local storage anyway
        // This ensures clean state even if server call fails
        return
      }
      console.error('Error signing out:', error)
      throw error
    }
  } catch (error: any) {
    // Catch any unexpected errors and handle gracefully
    // If it's a 403 or session error, user is already signed out
    if (
      error?.message?.includes('session') ||
      error?.message?.includes('Session') ||
      error?.status === 403 ||
      error?.message?.includes('403')
    ) {
      // User is already signed out, that's fine
      return
    }
    // Re-throw other errors
    throw error
  }
}

