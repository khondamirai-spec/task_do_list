import { supabase } from './supabase'

export type Profile = {
  id: string
  user_id: string
  full_name: string
  avatar_id?: number
  created_at?: string
  updated_at?: string
}

// Get current user's profile
export async function getProfile(): Promise<Profile | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // If profile doesn't exist, return null (not an error)
      if (error.code === 'PGRST116') {
        return null
      }
      // If table doesn't exist, return null (migration not run yet)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Profiles table does not exist yet. Please run the migration.')
        return null
      }
      console.error('Error fetching profile:', error)
      throw error
    }

    return data
  } catch (error: any) {
    // Handle any unexpected errors gracefully
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      console.warn('Profiles table does not exist yet. Please run the migration.')
      return null
    }
    throw error
  }
}

// Create or update user profile
export async function upsertProfile(fullName: string, avatarId?: number): Promise<Profile> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('User not authenticated')
  }

  const profileData = {
    user_id: user.id,
    full_name: fullName.trim(),
    avatar_id: avatarId || 1,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileData, {
      onConflict: 'user_id'
    })
    .select()
    .single()

  if (error) {
    console.error('Error upserting profile:', error)
    throw new Error(`Failed to save profile: ${error.message}`)
  }

  if (!data) {
    throw new Error('Profile creation succeeded but no data was returned')
  }

  return data
}

// Check if user has a profile
export async function hasProfile(): Promise<boolean> {
  try {
    const profile = await getProfile()
    return profile !== null
  } catch (error: any) {
    // If there's an error (like table doesn't exist), assume no profile
    // This allows the app to continue working even if migration hasn't been run
    console.warn('Error checking profile existence:', error?.message || error)
    return false
  }
}

