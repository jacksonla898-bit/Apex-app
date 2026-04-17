import { createClient } from '@supabase/supabase-js'

// Anon key is a public credential — safe to commit (Supabase security is RLS-based).
// Env vars are preferred; these are fallbacks so login works if Vercel vars are missing.
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL      || 'https://avsfhaiuxuwytvsqhgjz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_8yLZYDO-7ICthpQl-ZPvMw_UZ3jawd1'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Record a trade for the currently authenticated user.
// Called after a successful Alpaca execution so portfolio state stays per-user.
// price should be a plain number (not a formatted string).
export async function recordTrade({ symbol, side, quantity, price }) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { error } = await supabase.from('trades').insert({
    user_id: user.id,
    symbol: symbol.toUpperCase(),
    side,
    quantity,
    price,
  })

  if (error) {
    console.error('recordTrade error:', error.message, error.code, error.hint, error.details)
    throw error
  }
}