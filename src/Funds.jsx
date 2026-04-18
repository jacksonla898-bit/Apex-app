import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Plus, Check, X, BarChart3 } from 'lucide-react'
import { TopTraderBadge } from './TopTradersContext'

// ── Toast ──────────────────────────────────────────────────────────────────────
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold flex items-center gap-2">
        <Check className="w-4 h-4" /> {message}
      </div>
    </div>
  )
}

const FOCUS_RING = 'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#0f0f0f]'

function FieldError({ msg }) {
  return msg ? <p className="text-red-400 text-xs mt-1">{msg}</p> : null
}

// ── Create Fund Modal ──────────────────────────────────────────────────────────
const CreateFundModal = ({ onSubmit, onCancel }) => {
  const [form, setForm] = useState({ name: '', description: '', strategy: '', minInvestment: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (form.name.trim().length < 3)  e.name = 'Fund name must be at least 3 characters.'
    if (form.name.trim().length > 50) e.name = 'Fund name must be 50 characters or fewer.'
    if (form.description.length > 280) e.description = 'Description must be 280 characters or fewer.'
    const min = parseFloat(form.minInvestment)
    if (!form.minInvestment || isNaN(min)) e.minInvestment = 'Enter a valid dollar amount.'
    else if (min <= 0) e.minInvestment = 'Minimum investment must be greater than $0.'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    await onSubmit(form)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] rounded-2xl border border-[#2a2a2a] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-bold text-lg">Create a Fund</h2>
          <button onClick={onCancel} aria-label="Close" className={`text-gray-400 hover:text-white transition rounded ${FOCUS_RING}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white text-sm font-semibold">Fund Name</label>
              <span className={`text-xs tabular-nums ${form.name.length > 45 ? 'text-yellow-400' : 'text-gray-500'}`}>{form.name.length}/50</span>
            </div>
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="e.g., Conviction Growth Fund"
              maxLength={50}
              className={`w-full bg-[#1a1a1a] border text-white px-4 py-2.5 rounded-lg hover:border-[#3a3a3a] transition ${FOCUS_RING} ${errors.name ? 'border-red-500/60' : 'border-[#2a2a2a]'}`}
            />
            <FieldError msg={errors.name} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white text-sm font-semibold">Description</label>
              {(() => {
                const len = form.description.length
                const pct = len / 280
                const color = pct >= 1 ? 'text-red-400' : pct >= 0.8 ? 'text-yellow-400' : 'text-gray-500'
                return <span className={`text-xs tabular-nums ${color}`}>{len}/280</span>
              })()}
            </div>
            <textarea
              value={form.description}
              onChange={(e) => { if (e.target.value.length <= 280) set('description')(e) }}
              placeholder="What is your fund's focus and approach?"
              rows="3"
              maxLength={280}
              className={`w-full bg-[#1a1a1a] border text-white px-4 py-2.5 rounded-lg hover:border-[#3a3a3a] transition resize-none ${FOCUS_RING} ${errors.description ? 'border-red-500/60' : 'border-[#2a2a2a]'}`}
            />
            <FieldError msg={errors.description} />
          </div>

          <div>
            <label className="text-white text-sm font-semibold block mb-2">Strategy</label>
            <input
              value={form.strategy}
              onChange={set('strategy')}
              placeholder="e.g., Growth, Value, Momentum, Long/Short"
              className={`w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2.5 rounded-lg hover:border-[#3a3a3a] transition ${FOCUS_RING}`}
            />
          </div>

          <div>
            <label className="text-white text-sm font-semibold block mb-2">Minimum Investment ($)</label>
            <input
              type="number"
              value={form.minInvestment}
              onChange={set('minInvestment')}
              placeholder="1000"
              min="0.01"
              step="0.01"
              className={`w-full bg-[#1a1a1a] border text-white px-4 py-2.5 rounded-lg hover:border-[#3a3a3a] transition ${FOCUS_RING} ${errors.minInvestment ? 'border-red-500/60' : 'border-[#2a2a2a]'}`}
            />
            <FieldError msg={errors.minInvestment} />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white font-semibold py-2.5 rounded-lg transition border border-[#2a2a2a] ${FOCUS_RING}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition ${FOCUS_RING}`}
            >
              {loading ? 'Creating...' : 'Create Fund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Invest Modal ───────────────────────────────────────────────────────────────
const InvestModal = ({ fund, onSubmit, onCancel }) => {
  const [amount, setAmount] = useState(String(fund.min_investment || ''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fmtNum = (n) => Number(n).toLocaleString('en-US')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const val = parseFloat(amount)
    if (!val || val < Number(fund.min_investment)) {
      setError(`Minimum investment is $${fmtNum(fund.min_investment)}`)
      return
    }
    setLoading(true)
    await onSubmit(fund, val)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] rounded-2xl border border-[#2a2a2a] p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-white font-bold text-lg">Invest in Fund</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fund summary */}
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] mb-5">
          <div className="text-white font-semibold">{fund.name}</div>
          <div className="text-gray-400 text-sm mt-0.5">by {fund.manager_username}</div>
          <div className="flex items-center gap-3 mt-3">
            <div>
              <div className="text-gray-500 text-xs">Total Return</div>
              <div className="text-emerald-400 font-bold">+{Number(fund.total_return).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Min. Investment</div>
              <div className="text-white font-semibold text-sm">${fmtNum(fund.min_investment)}</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-white text-sm font-semibold block mb-2">
              Investment Amount ($)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError('') }}
              placeholder={fund.min_investment}
              min={fund.min_investment}
              step="0.01"
              required
              className={`w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2.5 rounded-lg hover:border-[#3a3a3a] transition ${FOCUS_RING}`}
            />
            {error
              ? <div className="text-red-400 text-xs mt-1.5">{error}</div>
              : <div className="text-gray-500 text-xs mt-1.5">
                  Minimum: ${fmtNum(fund.min_investment)}
                </div>
            }
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white font-semibold py-2.5 rounded-lg transition border border-[#2a2a2a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
            >
              {loading ? 'Investing...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Funds Screen ───────────────────────────────────────────────────────────────
const FundsScreen = ({ user }) => {
  const [funds, setFunds] = useState([])
  const [loading, setLoading] = useState(true)
  // { [fundId]: { amount } }
  const [userInvestments, setUserInvestments] = useState({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [investModal, setInvestModal] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchFunds()
  }, [])

  useEffect(() => {
    if (user) fetchUserInvestments()
  }, [user])

  const fetchFunds = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setFunds(data || [])
    } catch (err) {
      console.error('Error fetching funds:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserInvestments = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('fund_members')
        .select('fund_id, amount')
        .eq('user_id', user.id)
      if (error) throw error
      const map = {}
      data?.forEach(inv => { map[inv.fund_id] = inv })
      setUserInvestments(map)
    } catch (err) {
      console.error('Error fetching investments:', err)
    }
  }

  const handleCreateFund = async (formData) => {
    // Re-fetch the live session — don't trust the prop for auth
    const { data: { user: liveUser }, error: authError } = await supabase.auth.getUser()
    console.log('[CreateFund] live user:', liveUser?.id, '| prop user:', user?.id)
    if (authError || !liveUser) {
      console.error('[CreateFund] Auth error:', authError)
      setToast('Not authenticated — please log in again')
      return
    }

    try {
      const { data: profile } = await supabase
        .from('profiles').select('username').eq('id', liveUser.id).single()
      const managerUsername = profile?.username || liveUser.email?.split('@')[0] || 'Unknown'

      const insertPayload = {
        name: formData.name.trim(),
        manager_id: liveUser.id,
        manager_username: managerUsername,
        description: formData.description.trim(),
        strategy: formData.strategy.trim(),
        min_investment: parseFloat(formData.minInvestment) || 0,
        total_return: 0,
        aum: 0,
        member_count: 0,
      }
      console.log('[CreateFund] insert payload:', insertPayload)

      const { data, error } = await supabase.from('funds').insert([insertPayload]).select()
      if (error) {
        console.error('[CreateFund] Supabase error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        throw error
      }
      console.log('[CreateFund] success, inserted row:', data)

      setToast('Fund created!')
      setShowCreateModal(false)
      fetchFunds()
    } catch (err) {
      console.error('[CreateFund] caught error:', err)
      setToast(`Failed to create fund: ${err.message}`)
    }
  }

  const handleInvest = async (fund, amount) => {
    if (!user) return
    try {
      const { error: memberError } = await supabase
        .from('fund_members')
        .insert([{ fund_id: fund.id, user_id: user.id, amount }])
      if (memberError) throw memberError

      const { error: updateError } = await supabase
        .from('funds')
        .update({
          aum: Number(fund.aum || 0) + amount,
          member_count: Number(fund.member_count || 0) + 1,
        })
        .eq('id', fund.id)
      if (updateError) throw updateError

      setToast(`Invested $${amount.toLocaleString()} in ${fund.name}!`)
      setInvestModal(null)
      fetchFunds()
      fetchUserInvestments()
    } catch (err) {
      console.error('Error investing:', err)
      setToast('Failed to invest — you may already be invested in this fund')
    }
  }

  const fmtMoney = (n) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtAum = (n) => {
    const num = Number(n)
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
    return `$${num.toLocaleString()}`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-white font-bold text-lg">Investment Funds</h2>
        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Create Fund
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">
          <div className="w-8 h-8 border-4 border-[#2a2a2a] border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          Loading funds...
        </div>
      ) : funds.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-2xl p-10 border border-[#2a2a2a] text-center">
          <BarChart3 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold mb-1">No funds yet.</div>
          <div className="text-gray-500 text-sm">Be the first to create one!</div>
        </div>
      ) : (
        funds.map(fund => {
          const investment = userInvestments[fund.id]
          const isInvested = !!investment

          return (
            <div
              key={fund.id}
              className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a] space-y-4"
            >
              {/* Name + return */}
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-3">
                  <div className="font-bold text-white text-base">{fund.name}</div>
                  <div className="text-gray-400 text-sm mt-0.5 flex items-center gap-1.5">
                    by {fund.manager_username}
                    <TopTraderBadge userId={fund.manager_id} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-emerald-400 text-2xl font-bold leading-none">
                    +{Number(fund.total_return).toFixed(1)}%
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5">Total Return</div>
                </div>
              </div>

              {/* Description */}
              {fund.description ? (
                <p className="text-gray-400 text-sm leading-relaxed">{fund.description}</p>
              ) : null}

              {/* Strategy tag */}
              {fund.strategy ? (
                <div>
                  <span className="inline-block bg-blue-500/10 text-blue-300 text-xs px-2.5 py-1 rounded-full border border-blue-500/20 font-medium">
                    {fund.strategy}
                  </span>
                </div>
              ) : null}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#2a2a2a]">
                <div>
                  <div className="text-gray-500 text-xs mb-0.5">AUM</div>
                  <div className="text-white text-sm font-semibold">{fmtAum(fund.aum)}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-0.5">Members</div>
                  <div className="text-white text-sm font-semibold">{fund.member_count || 0}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-0.5">Min. Invest</div>
                  <div className="text-white text-sm font-semibold">
                    ${Number(fund.min_investment).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* CTA */}
              {isInvested ? (
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <Check className="w-4 h-4" /> Invested
                  </div>
                  <div className="text-emerald-400 text-sm font-bold">
                    ${fmtMoney(investment.amount)}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() =>
                    user
                      ? setInvestModal(fund)
                      : setToast('Please log in to invest')
                  }
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-xl transition text-sm"
                >
                  Invest Now
                </button>
              )}
            </div>
          )
        })
      )}

      {showCreateModal && (
        <CreateFundModal
          onSubmit={handleCreateFund}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {investModal && (
        <InvestModal
          fund={investModal}
          onSubmit={handleInvest}
          onCancel={() => setInvestModal(null)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

export default FundsScreen
