import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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