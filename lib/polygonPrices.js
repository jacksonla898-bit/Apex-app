/**
 * Fetches current price snapshots from Polygon.io for one or more symbols.
 * Works for both stocks and ETFs on the free tier (15-minute delay).
 *
 * @param {string[]} symbols
 * @returns {Promise<Map<string, { price: number|null, dailyBar: {o,h,l,c,v}|null }>>}
 */
export async function fetchPolygonPrices(symbols) {
  const entries = await Promise.all(
    symbols.map(async (raw) => {
      const sym = raw.toUpperCase()
      try {
        const res = await fetch(
          `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(sym)}?apiKey=${process.env.POLYGON_API_KEY}`
        )
        if (!res.ok) return [sym, { price: null, dailyBar: null }]
        const data = await res.json()
        const ticker = data?.ticker
        if (!ticker) return [sym, { price: null, dailyBar: null }]

        const day      = ticker.day
        const prevDay  = ticker.prevDay
        const lastTrade = ticker.lastTrade

        // Prefer today's close, fall back to previous close, then last trade price
        const price = day?.c || prevDay?.c || lastTrade?.p || null

        // Use today's bar if it has OHLC data, otherwise fall back to prevDay
        const bar = day?.o ? day : prevDay
        const dailyBar = bar ? { o: bar.o, h: bar.h, l: bar.l, c: bar.c, v: bar.v } : null

        return [sym, { price, dailyBar }]
      } catch (err) {
        console.error(`Polygon fetch failed for ${sym}:`, err.message)
        return [sym, { price: null, dailyBar: null }]
      }
    })
  )
  return new Map(entries)
}
