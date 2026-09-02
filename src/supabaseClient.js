import { createClient } from '@supabase/supabase-js'

const env = (typeof import.meta !== 'undefined' && import.meta.env) || process?.env || {}
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || 'https://sbdlfyfkpatnxkrmslvq.supabase.co'
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZGxmeWZrcGF0bnhrcm1zbHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTM2NjMsImV4cCI6MjA4OTU2OTY2M30.eLqakT_Yus8i17cDzJWRGdgvQMSDzvuqHnvjb3AeVPE'

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
