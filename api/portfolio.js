// Portfolio data is now stored per-user in the Supabase `trades` table.
// The frontend reads trades directly from Supabase (authenticated, RLS-scoped)
// and calculates positions client-side. This endpoint is no longer used.
export default async function handler(req, res) {
  res.status(410).json({
    error: 'This endpoint is deprecated. Portfolio data is now read from Supabase.'
  })
}
