/**
 * Fetches real-time price quotes from Finnhub for one or more symbols.
 * Free tier: 60 calls/minute, real-time US stocks and ETFs.
 *
 * @param {string[]} symbols
 * @returns {Promise<Map<string, { price: number|null, dailyBar: {o,h,l,c,v,change}|null }>>}
 */
export async function fetchFinnhubPrices(symbols) {
  console.log('[Finnhub] FINNHUB_API_KEY:', process.env.FINNHUB_API_KEY ? 'defined' : 'undefined')
  const entries = await Promise.all(
    symbols.map(async (raw) => {
      const sym = raw.toUpperCase()
      try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${process.env.FINNHUB_API_KEY}`
        const res = await fetch(url)
        if (!res.ok) return [sym, { price: null, dailyBar: null }]
        const data = await res.json()
        // { c: current, d: change, dp: pct_change, h: high, l: low, o: open, pc: prev_close, t: timestamp }
        if (!data || data.c == null || data.c === 0) return [sym, { price: null, dailyBar: null }]
        return [sym, {
          price: data.c,
          dailyBar: { o: data.o, h: data.h, l: data.l, c: data.c, v: 0, change: data.dp },
        }]
      } catch (err) {
        console.error(`Finnhub fetch failed for ${sym}:`, err.message)
        return [sym, { price: null, dailyBar: null }]
      }
    })
  )
  return new Map(entries)
}
