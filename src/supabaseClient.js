import { createClient } from '@supabase/supabase-js'

// Anon key is a public credential — safe to commit (Supabase security is RLS-based).
// Env vars are preferred; these are fallbacks so login works if Vercel vars are missing.
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL      || 'https://avsfhaiuxuwytvsqhgjz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2c2ZoYWl1eHV3eXR2c3FoZ2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2OTc1MTMsImV4cCI6MjA5MTI3MzUxM30.Ssz6J79LcC_SXJkO4amD0ivq2rP0CGbsh3i5M_nL8Qk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Record a trade for the currently authenticated user.
// Called after a successful Alpaca execution so portfolio state stays per-user.
// price should be a plain number (not a formatted string).
export async function recordTrade({ symbol, side, quantity, price, sentiment = null }) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const row = {
    user_id: user.id,
    symbol: symbol.toUpperCase(),
    side,
    quantity,
    price,
  }
  if (sentiment) row.sentiment = sentiment

  const { error } = await supabase.from('trades').insert(row)

  if (error) {
    console.error('recordTrade error:', error.message, error.code, error.hint, error.details)
    throw error
  }
}