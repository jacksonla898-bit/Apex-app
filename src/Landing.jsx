import { useState } from 'react'
import {
  Zap,
  Users,
  Rss,
  ArrowRight,
  TrendingUp,
  Shield,
  Activity,
  X,
  Check,
} from 'lucide-react'
import Login from './Login'

// ── Auth Modal ─────────────────────────────────────────────────────────────────
const AuthModal = ({ onClose, onAuthSuccess }) => (
  <div
    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md">
      <button
        onClick={onClose}
        className="absolute -top-3 -right-3 z-10 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400 hover:text-white rounded-full p-1.5 transition"
      >
        <X className="w-4 h-4" />
      </button>
      <Login onAuthSuccess={onAuthSuccess} />
    </div>
  </div>
)

// ── Mock signal card shown in hero ─────────────────────────────────────────────
const SignalCard = () => (
  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 w-72 shadow-2xl">
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-white font-bold text-xl">NVDA</div>
        <div className="text-gray-500 text-xs">NASDAQ · 1h timeframe</div>
      </div>
      <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
        BUY Signal
      </span>
    </div>
    <div className="bg-[#0f0f0f] rounded-xl p-3 mb-4 border border-[#2a2a2a]">
      <p className="text-gray-300 text-xs leading-relaxed">
        Strong momentum with RSI breakout above 60. MACD crossover confirmed.
        Institutional buying pressure detected.
      </p>
    </div>
    <div className="space-y-2 mb-4">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500">Conviction</span>
        <span className="text-emerald-400 font-semibold">84%</span>
      </div>
      <div className="w-full h-1.5 bg-[#0f0f0f] rounded-full">
        <div className="h-full w-[84%] bg-emerald-500 rounded-full" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="bg-[#0f0f0f] rounded-lg p-2 border border-[#2a2a2a]">
        <div className="text-gray-500 text-xs">Entry</div>
        <div className="text-white text-xs font-semibold">$875</div>
      </div>
      <div className="bg-[#0f0f0f] rounded-lg p-2 border border-emerald-500/20">
        <div className="text-gray-500 text-xs">Target</div>
        <div className="text-emerald-400 text-xs font-semibold">$940</div>
      </div>
      <div className="bg-[#0f0f0f] rounded-lg p-2 border border-red-500/20">
        <div className="text-gray-500 text-xs">Stop</div>
        <div className="text-red-400 text-xs font-semibold">$848</div>
      </div>
    </div>
  </div>
)

// ── Portfolio preview card ─────────────────────────────────────────────────────
const PortfolioCard = () => (
  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 w-72 shadow-2xl">
    <div className="text-gray-400 text-xs mb-1">Total Portfolio Value</div>
    <div className="text-white text-3xl font-bold mb-1">$24,831.50</div>
    <div className="flex items-center gap-1.5 mb-4">
      <TrendingUp className="w-4 h-4 text-emerald-400" />
      <span className="text-emerald-400 text-sm font-semibold">+$1,243.20 (5.26%)</span>
    </div>
    {[
      { sym: 'NVDA', qty: '5 shares', price: '$875.00', pl: '+$312.50', pos: true },
      { sym: 'AAPL', qty: '10 shares', price: '$189.50', pl: '+$87.20', pos: true },
      { sym: 'TSLA', qty: '3 shares', price: '$248.00', pl: '-$42.00', pos: false },
    ].map(p => (
      <div key={p.sym} className="flex items-center justify-between py-2 border-t border-[#2a2a2a]">
        <div>
          <div className="text-white text-sm font-semibold">{p.sym}</div>
          <div className="text-gray-500 text-xs">{p.qty}</div>
        </div>
        <div className="text-right">
          <div className="text-white text-sm">{p.price}</div>
          <div className={`text-xs font-semibold ${p.pos ? 'text-emerald-400' : 'text-red-400'}`}>{p.pl}</div>
        </div>
      </div>
    ))}
  </div>
)

// ── Landing Page ───────────────────────────────────────────────────────────────
const Landing = ({ onAuthSuccess }) => {
  const [showAuth, setShowAuth] = useState(false)

  const openAuth = () => setShowAuth(true)
  const closeAuth = () => setShowAuth(false)

  const handleAuthSuccess = () => {
    setShowAuth(false)
    onAuthSuccess()
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-[#1a1a1a] bg-[#0f0f0f]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
            Conviction
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openAuth}
              className="text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition"
            >
              Sign In
            </button>
            <button
              onClick={openAuth}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glow elements */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">

            {/* Left — copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Zap className="w-3.5 h-3.5" />
                Powered by Claude AI
              </div>

              <h1 className="text-5xl lg:text-6xl font-black leading-tight mb-6">
                The AI-Powered Trading Platform
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
                  Built on Conviction
                </span>
              </h1>

              <p className="text-gray-400 text-lg lg:text-xl leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
                Run AI trade signals, copy top traders, and grow your portfolio —
                all in one place.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <button
                  onClick={openAuth}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-4 rounded-xl transition text-base w-full sm:w-auto justify-center"
                >
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl transition text-base w-full sm:w-auto justify-center"
                >
                  See How It Works
                </button>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-2 mt-8 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {['JL', 'MK', 'SR', 'AT'].map((initials) => (
                    <div
                      key={initials}
                      className="w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-[#0f0f0f] flex items-center justify-center text-emerald-400 text-xs font-bold"
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <span className="text-gray-400 text-sm">
                  Join traders already using Conviction
                </span>
              </div>
            </div>

            {/* Right — product preview cards */}
            <div className="flex-shrink-0 relative hidden lg:block">
              <div className="relative">
                <div className="absolute -top-4 -left-4 opacity-70">
                  <PortfolioCard />
                </div>
                <div className="relative translate-x-8 translate-y-8 z-10">
                  <SignalCard />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-[#1a1a1a] bg-[#111] py-8 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: Zap,      label: 'AI-Powered Signals',  sub: 'Claude AI analysis' },
            { icon: Shield,   label: 'Paper Trading',       sub: 'Risk-free practice' },
            { icon: Activity, label: 'Real-Time Data',      sub: 'Live market feeds' },
            { icon: Check,    label: 'Free to Start',       sub: 'No credit card needed' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-white font-semibold text-sm">{label}</div>
              <div className="text-gray-500 text-xs">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-16">
            <div className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Everything you need
            </div>
            <h2 className="text-4xl font-black mb-4">
              Built for serious traders
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Every tool you need to find great trades, execute with confidence,
              and learn from the best.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                color: 'emerald',
                title: 'AI Trade Signals',
                desc: 'Claude AI analyzes live market data and generates real BUY/SELL/HOLD signals with conviction scores, entry points, targets, and stop losses.',
                highlights: ['Conviction scoring', 'Entry & exit levels', 'Risk assessment'],
              },
              {
                icon: Users,
                color: 'blue',
                title: 'Copy Top Traders',
                desc: 'Follow the best performing traders and automatically copy their trades into your portfolio with one tap — no guesswork required.',
                highlights: ['One-tap copy trades', 'Track trader performance', 'Build your following'],
              },
              {
                icon: Rss,
                color: 'purple',
                title: 'Social Feed',
                desc: 'Share your trades, build a following, and discover winning strategies from the community. Like and reply to trade ideas in real time.',
                highlights: ['Post trade signals', 'Real-time reactions', 'Community insights'],
              },
            ].map(({ icon: Icon, color, title, desc, highlights }) => {
              const colorMap = {
                emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', dot: 'bg-emerald-400' },
                blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: 'text-blue-400',    dot: 'bg-blue-400' },
                purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  icon: 'text-purple-400',  dot: 'bg-purple-400' },
              }
              const c = colorMap[color]
              return (
                <div
                  key={title}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 hover:border-[#3a3a3a] transition group"
                >
                  <div className={`w-12 h-12 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-5`}>
                    <Icon className={`w-6 h-6 ${c.icon}`} />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-3">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-5">{desc}</p>
                  <ul className="space-y-2">
                    {highlights.map(h => (
                      <li key={h} className="flex items-center gap-2 text-sm text-gray-300">
                        <div className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6 bg-[#111] border-y border-[#1a1a1a]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">
            Simple by design
          </div>
          <h2 className="text-4xl font-black mb-16">Get trading in 3 steps</h2>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { step: '01', title: 'Create your account', desc: 'Sign up free in under a minute. No credit card required.' },
              { step: '02', title: 'Run your first signal', desc: 'Pick any ticker, set your risk tolerance, and let Claude AI do the analysis.' },
              { step: '03', title: 'Execute & track', desc: 'Place trades via Alpaca paper trading, follow top traders, and watch your portfolio grow.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-lg mb-4">
                  {step}
                </div>
                <h3 className="text-white font-bold text-base mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/5 rounded-3xl blur-2xl" />
            <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-3xl p-12">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-4xl font-black mb-4">
                Ready to trade smarter?
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Join Conviction and start running AI-powered signals today. It's free.
              </p>
              <button
                onClick={openAuth}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-10 py-4 rounded-xl transition text-base mx-auto"
              >
                Sign Up Free <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-gray-600 text-xs mt-4">No credit card · Paper trading · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1a1a1a] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
            Conviction
          </div>
          <p className="text-gray-600 text-sm">
            Trade with Conviction
          </p>
          <p className="text-gray-600 text-xs">
            For paper trading and educational purposes only.
          </p>
        </div>
      </footer>

      {/* ── Auth modal ── */}
      {showAuth && (
        <AuthModal onClose={closeAuth} onAuthSuccess={handleAuthSuccess} />
      )}

    </div>
  )
}

export default Landing
