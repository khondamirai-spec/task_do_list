import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
  throw new Error('Missing Supabase environment variables')
}

console.log('Supabase client initialized:', {
  url: supabaseUrl?.substring(0, 30) + '...',
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length || 0
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
