import { useState, useEffect } from 'react'
import { Trophy, TrendingUp, TrendingDown, User } from 'lucide-react'
import { TopTraderBadge } from './TopTradersContext'

const MEDAL_STYLES = [
  { border: 'border-yellow-500/40', bg: 'bg-yellow-500/5',  numColor: 'text-yellow-400',  numBg: 'bg-yellow-500/20 border-yellow-500/40' },
  { border: 'border-gray-400/30',   bg: 'bg-gray-400/5',    numColor: 'text-gray-300',    numBg: 'bg-gray-400/20 border-gray-400/30' },
  { border: 'border-amber-700/40',  bg: 'bg-amber-700/5',   numColor: 'text-amber-600',   numBg: 'bg-amber-700/20 border-amber-700/40' },
]

const pctColor  = (v) => v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-gray-400'
const pctPrefix = (v) => v > 0 ? '+' : ''

const LeaderboardScreen = ({ user }) => {
  const [leaderboard, setLeaderboard]   = useState([])
  const [userRank, setUserRank]         = useState(null)
  const [usernameMap, setUsernameMap]   = useState({})
  const [totalUsers, setTotalUsers]     = useState(0)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [timeFilter, setTimeFilter]     = useState('all')
  const [toast, setToast]               = useState(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const url = `/api/top-traders?limit=100&userId=${encodeURIComponent(user.id)}`
    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        setLeaderboard(data.leaderboard || [])
        setUserRank(data.userRank ?? null)
        setTotalUsers(data.totalUsers || 0)

        const ids = (data.leaderboard || []).map(u => u.userId)
        if (ids.length === 0) return
        return fetch('/api/usernames', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userIds: ids }),
        })
          .then(r => r.ok ? r.json() : {})
          .then(map => setUsernameMap(map))
      })
      .catch(() => setError('Failed to load leaderboard'))
      .finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  const displayName = (userId) =>
    usernameMap[userId] ? `@${usernameMap[userId]}` : 'Trader'

  const TIME_FILTERS = [
    { id: 'all', label: 'All Time' },
    { id: '30d', label: '30D' },
    { id: '7d',  label: '7D' },
    { id: '1d',  label: 'Today' },
  ]

  const podium = leaderboard.slice(0, 3)
  const rest   = leaderboard.slice(3)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="w-10 h-10 border-4 border-[#2a2a2a] border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300 text-sm text-center">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full space-y-5 pb-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h1 className="text-white font-bold text-xl">Leaderboard</h1>
        </div>
        <p className="text-gray-500 text-sm">Top traders on Conviction</p>
      </div>

      {/* Time filter pills */}
      <div className="flex gap-2">
        {TIME_FILTERS.map(f => (
          <button
            key={f.id}
            aria-label={`Filter: ${f.label}`}
            aria-pressed={timeFilter === f.id}
            onClick={() => {
              if (f.id !== 'all') { setToast('Coming soon'); return }
              setTimeFilter(f.id)
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-[#0f0f0f] ${
              timeFilter === f.id
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {leaderboard.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-2xl p-10 border border-[#2a2a2a] text-center">
          <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold mb-1">No traders yet.</div>
          <div className="text-gray-500 text-sm">Place your first trade to join the leaderboard.</div>
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {podium.length > 0 && (
            <div className="space-y-3">
              {podium.map((trader, i) => {
                const style = MEDAL_STYLES[i]
                return (
                  <div
                    key={trader.userId}
                    className={`rounded-2xl p-4 border ${style.border} ${style.bg} space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-black shrink-0 ${style.numBg} ${style.numColor}`}>
                          {i + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                            {displayName(trader.userId)}
                            <TopTraderBadge userId={trader.userId} />
                          </div>
                          <div className="text-gray-500 text-xs">{trader.tradeCount} trades</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-black ${pctColor(trader.percentReturn)}`}>
                          {pctPrefix(trader.percentReturn)}{trader.percentReturn.toFixed(2)}%
                        </div>
                        {trader.percentReturn >= 0
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400 ml-auto" />
                          : <TrendingDown className="w-3.5 h-3.5 text-red-400 ml-auto" />
                        }
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs pt-1 border-t border-white/5">
                      <div>
                        <span className="text-gray-500">P&amp;L </span>
                        <span className={`font-semibold ${pctColor(trader.totalPnl)}`}>
                          {trader.totalPnl >= 0 ? '+' : ''}${trader.totalPnl.toFixed(2)}
                        </span>
                      </div>
                      {trader.winRate !== null && (
                        <div>
                          <span className="text-gray-500">Win rate </span>
                          <span className="text-white font-semibold">{trader.winRate.toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Ranks 4+ */}
          {rest.length > 0 && (
            <div className="space-y-1.5">
              {rest.map((trader, i) => (
                <div
                  key={trader.userId}
                  className="flex items-center justify-between bg-[#1a1a1a] rounded-xl px-4 py-3 border border-[#2a2a2a]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 text-xs font-bold w-5 text-right shrink-0">{i + 4}</span>
                    <div>
                      <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                        {displayName(trader.userId)}
                        <TopTraderBadge userId={trader.userId} />
                      </div>
                      <div className="text-gray-600 text-xs">{trader.tradeCount} trades{trader.winRate !== null ? ` · ${trader.winRate.toFixed(0)}% win` : ''}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${pctColor(trader.percentReturn)}`}>
                      {pctPrefix(trader.percentReturn)}{trader.percentReturn.toFixed(2)}%
                    </div>
                    <div className={`text-xs ${pctColor(trader.totalPnl)}`}>
                      {trader.totalPnl >= 0 ? '+' : ''}${trader.totalPnl.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* YOUR RANK sticky card */}
      <div className="sticky bottom-0 pt-2">
        <div className={`rounded-2xl p-4 border ${
          userRank && userRank.rank <= 3
            ? 'border-yellow-500/40 bg-yellow-500/5'
            : 'border-emerald-500/30 bg-emerald-500/5'
        }`}>
          {userRank ? (
            <>
              {userRank.rank <= 3 && (
                <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-semibold mb-2">
                  <Trophy className="w-3.5 h-3.5" /> You're on the podium!
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Your Rank</div>
                  <div className="text-white font-black text-2xl">
                    #{userRank.rank}
                    <span className="text-gray-500 text-sm font-normal"> / {userRank.totalUsers}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-black ${pctColor(userRank.percentReturn)}`}>
                    {pctPrefix(userRank.percentReturn)}{userRank.percentReturn.toFixed(2)}%
                  </div>
                  {userRank.winRate !== null && (
                    <div className="text-gray-500 text-xs">{userRank.winRate.toFixed(0)}% win rate</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-600 shrink-0" />
              <div>
                <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Your Rank</div>
                <div className="text-gray-400 text-sm">Place your first trade to join the leaderboard.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-[#2a2a2a] text-gray-200 px-5 py-2.5 rounded-lg shadow-lg text-sm font-semibold border border-[#3a3a3a]">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaderboardScreen
