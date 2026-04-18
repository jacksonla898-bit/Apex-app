import { useState, useEffect, useRef } from 'react'
import {
  Zap,
  Users,
  ArrowRight,
  TrendingUp,
  Brain,
  Trophy,
  X,
  Activity,
  Target,
  BarChart2,
} from 'lucide-react'
import Login from './Login'

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap'
const SYNE = { fontFamily: "'Syne', sans-serif" }

function useSyneFont() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_URL}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONT_URL
    document.head.appendChild(link)
  }, [])
}

function useInView(threshold = 0.12) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

function FadeIn({ children, delay = 0, className = '' }) {
  const [ref, visible] = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}

function AnimatedBar({ value, barClass, trigger, delay = 0 }) {
  return (
    <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
      <div
        className={`h-full ${barClass} rounded-full transition-all duration-1000 ease-out`}
        style={{ width: trigger ? `${value}%` : '0%', transitionDelay: `${delay}ms` }}
      />
    </div>
  )
}

function StackBar({ value, barClass }) {
  const [ref, visible] = useInView(0.2)
  return (
    <div ref={ref}>
      <AnimatedBar value={value} barClass={barClass} trigger={visible} />
    </div>
  )
}

function HeroSignalCard() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 500)
    return () => clearTimeout(t)
  }, [])

  const signals = [
    { label: 'AI Signal',    pct: 78, barClass: 'bg-emerald-500', textColor: 'text-emerald-400', delay: 0 },
    { label: 'Top Traders',  pct: 65, barClass: 'bg-blue-500',    textColor: 'text-blue-400',    delay: 120 },
    { label: 'Community',    pct: 72, barClass: 'bg-purple-500',  textColor: 'text-purple-400',  delay: 240 },
  ]

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl blur-3xl scale-110 pointer-events-none" />
      <div className="relative bg-[#111] border border-white/8 rounded-2xl p-5 w-[320px] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-white font-black text-2xl" style={SYNE}>TSLA</div>
            <div className="text-gray-500 text-xs mt-0.5">Tesla Inc · NASDAQ</div>
          </div>
          <div className="text-right">
            <div className="text-white font-semibold text-sm">$248.50</div>
            <div className="text-emerald-400 text-xs">+3.2% today</div>
          </div>
        </div>

        <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 mb-5">
          <Zap className="w-3.5 h-3.5" />
          BUY Signal · High Conviction
        </div>

        {/* Conviction stack */}
        <div className="space-y-3 mb-5">
          {signals.map((s) => (
            <div key={s.label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">{s.label}</span>
                <span className={`font-bold ${s.textColor}`}>{s.pct}%</span>
              </div>
              <AnimatedBar value={s.pct} barClass={s.barClass} trigger={ready} delay={s.delay} />
            </div>
          ))}
        </div>

        {/* Overall score */}
        <div className="bg-[#0a0a0a] rounded-xl p-3 mb-4 border border-emerald-500/20 flex items-center justify-between">
          <span className="text-gray-400 text-xs">Overall Conviction</span>
          <span className="text-emerald-400 font-black text-xl" style={SYNE}>
            {ready ? '72%' : '—'}
          </span>
        </div>

        {/* Price levels */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-[#0a0a0a] rounded-lg p-2.5 text-center border border-white/5">
            <div className="text-gray-500 text-xs mb-0.5">Entry</div>
            <div className="text-white text-sm font-bold">$248</div>
          </div>
          <div className="bg-[#0a0a0a] rounded-lg p-2.5 text-center border border-emerald-500/20">
            <div className="text-gray-500 text-xs mb-0.5">Target</div>
            <div className="text-emerald-400 text-sm font-bold">$278</div>
          </div>
          <div className="bg-[#0a0a0a] rounded-lg p-2.5 text-center border border-red-500/20">
            <div className="text-gray-500 text-xs mb-0.5">Stop</div>
            <div className="text-red-400 text-sm font-bold">$235</div>
          </div>
        </div>

        {/* Bull / Bear */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-2.5">
            <div className="text-emerald-400 text-xs font-bold mb-1">Bull Case</div>
            <div className="text-gray-400 text-xs leading-relaxed">FSD milestone + EV demand rebound</div>
          </div>
          <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-2.5">
            <div className="text-red-400 text-xs font-bold mb-1">Bear Case</div>
            <div className="text-gray-400 text-xs leading-relaxed">Margin pressure from price cuts</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const AuthModal = ({ onClose, onAuthSuccess }) => (
  <div
    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md">
      <button
        type="button"
        onClick={onClose}
        className="absolute -top-3 -right-3 z-10 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400 hover:text-white rounded-full p-1.5 transition"
      >
        <X className="w-4 h-4" />
      </button>
      <Login onAuthSuccess={onAuthSuccess} />
    </div>
  </div>
)

export default function Landing({ onAuthSuccess }) {
  useSyneFont()
  const [showAuth, setShowAuth] = useState(false)

  const openAuth  = () => setShowAuth(true)
  const closeAuth = () => setShowAuth(false)
  const handleAuthSuccess = () => { setShowAuth(false); onAuthSuccess() }
  const scrollToHow = () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">

      {/* Grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          opacity: 0.035,
        }}
      />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300" style={SYNE}>
            Conviction
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openAuth}
              className="text-gray-400 hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={openAuth}
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold px-5 py-2 rounded-lg transition"
              style={SYNE}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-24 px-6 overflow-hidden">
        {/* Radial gradient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.10) 0%, transparent 65%)' }}
        />
        <div className="absolute top-40 -left-24 w-96 h-96 bg-emerald-500/6 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '7s' }} />
        <div className="absolute top-56 -right-24 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '9s', animationDelay: '3s' }} />

        <div className="relative max-w-6xl mx-auto z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">

            {/* Left — copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-8">
                <Zap className="w-3.5 h-3.5" />
                Powered by Claude AI
              </div>

              <h1 className="text-6xl lg:text-7xl xl:text-[88px] font-black leading-none mb-6" style={SYNE}>
                Trade with
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500">
                  Conviction
                </span>
              </h1>

              <p className="text-gray-400 text-lg lg:text-xl leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
                AI-powered trade signals. Community conviction. Real-time leaderboards.
                The smartest way to trade — backed by data, not gut feeling.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-10">
                <button
                  type="button"
                  onClick={openAuth}
                  className="flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black px-8 py-4 rounded-xl transition-all text-base w-full sm:w-auto justify-center shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35"
                  style={SYNE}
                >
                  Start Trading Free <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={scrollToHow}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition text-base w-full sm:w-auto justify-center"
                >
                  See How It Works
                </button>
              </div>

              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {['JL', 'MK', 'SR', 'AT'].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-[#0a0a0a] flex items-center justify-center text-white text-xs font-bold">
                      {i}
                    </div>
                  ))}
                </div>
                <span className="text-gray-500 text-sm">Join traders already on Conviction</span>
              </div>
            </div>

            {/* Right — animated signal card */}
            <div className="flex-shrink-0 hidden lg:flex items-center justify-center">
              <HeroSignalCard />
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats banner ── */}
      <section className="border-y border-white/5 bg-[#0d0d0d] py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { stat: '$10,000', label: 'Starting cash' },
            { stat: '5',       label: 'AI dimensions scored' },
            { stat: '3',       label: 'Conviction signals' },
            { stat: 'Live',    label: 'Market data' },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div className="text-2xl lg:text-3xl font-black text-white mb-1" style={SYNE}>{stat}</div>
              <div className="text-gray-500 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <div className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Simple by design</div>
            <h2 className="text-4xl lg:text-5xl font-black mb-5" style={SYNE}>Get started in 3 steps</h2>
            <p className="text-gray-400 text-lg max-w-md mx-auto">No complex setup. No learning curve. Just data-driven trading.</p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: '01',
                icon: Activity,
                title: 'Search any stock',
                desc: 'Type any ticker symbol. Our AI instantly analyzes price action, momentum, and market context in seconds.',
              },
              {
                n: '02',
                icon: BarChart2,
                title: 'See the Conviction Stack',
                desc: 'Get three independent signals — AI analysis, top trader sentiment, and community conviction — blended into one score.',
              },
              {
                n: '03',
                icon: Target,
                title: 'Trade with confidence',
                desc: 'Execute paper trades with full context: entry, target, stop loss, bull/bear cases, and risk assessment all in one card.',
              },
            ].map(({ n, icon: Icon, title, desc }, i) => (
              <FadeIn key={n} delay={i * 100}>
                <div className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-emerald-500/20 transition group relative overflow-hidden h-full">
                  <div
                    className="absolute top-0 right-0 text-[120px] font-black text-white/[0.025] leading-none select-none -translate-y-4 translate-x-2"
                    style={SYNE}
                  >
                    {n}
                  </div>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:bg-emerald-500/15 transition">
                      <Icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-3" style={SYNE}>{title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 bg-[#0d0d0d] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <div className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Everything you need</div>
            <h2 className="text-4xl lg:text-5xl font-black mb-5" style={SYNE}>Built for serious traders</h2>
            <p className="text-gray-400 text-lg max-w-md mx-auto">Every tool to find great trades, execute with confidence, and outperform the market.</p>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Brain,
                accent: 'emerald',
                title: 'AI Signal Cards',
                desc: 'Structured analysis, not paragraphs. Every signal includes a conviction scorecard, bull/bear cases, price targets, and stop losses — generated by Claude AI in real time.',
                tags: ['Conviction scoring', 'Entry & exit levels', 'Risk assessment', 'Bull/Bear cases'],
              },
              {
                icon: Users,
                accent: 'blue',
                title: 'Community Conviction',
                desc: 'See what other traders think. Top holders, whale activity, and community sentiment all factor into the conviction score. Trade with the crowd or against it — your call.',
                tags: ['Community sentiment', 'Top holders view', 'Copy top traders', 'Social feed'],
              },
              {
                icon: Trophy,
                accent: 'amber',
                title: 'Smart Leaderboard',
                desc: 'Compete on real performance. Our composite ranking blends returns, win rate, and risk discipline. Top Trader badges unlock follower perks and copy-trade visibility.',
                tags: ['Composite ranking', 'Top Trader badges', 'Win rate tracking', 'Risk discipline'],
              },
              {
                icon: TrendingUp,
                accent: 'purple',
                title: 'Portfolio AI',
                desc: 'AI watches your open positions and fires exit signals. Know exactly when to hold, trim, or sell — with data-backed reasoning, not emotion.',
                tags: ['Exit signal alerts', 'Position monitoring', 'Trim & sell signals', 'P&L tracking'],
              },
            ].map(({ icon: Icon, accent, title, desc, tags }, i) => {
              const styles = {
                emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', tag: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
                blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    tag: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
                amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   tag: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
                purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  tag: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
              }[accent]
              return (
                <FadeIn key={title} delay={i * 80}>
                  <div className="bg-[#111] border border-white/5 rounded-2xl p-7 hover:border-white/10 transition h-full flex flex-col">
                    <div className={`w-12 h-12 rounded-xl ${styles.bg} border ${styles.border} flex items-center justify-center mb-5 shrink-0`}>
                      <Icon className={`w-6 h-6 ${styles.text}`} />
                    </div>
                    <h3 className="text-white font-black text-xl mb-3" style={SYNE}>{title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-5 flex-1">{desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((t) => (
                        <span key={t} className={`text-xs px-2.5 py-1 rounded-full font-medium ${styles.tag}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── The Conviction Stack ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <div className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">The edge</div>
            <h2 className="text-4xl lg:text-5xl font-black mb-5" style={SYNE}>The Conviction Stack</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Three independent signals. One blended score. No single data source dominates — that's the point.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              {
                icon: Brain,
                color: 'emerald',
                label: 'AI Signal',
                weight: 40,
                barClass: 'bg-emerald-500',
                textColor: 'text-emerald-400',
                desc: 'Claude AI analyzes momentum, RSI, MACD, volume, and macro context. Pure data, zero emotion.',
              },
              {
                icon: Trophy,
                color: 'blue',
                label: 'Top Traders',
                weight: 35,
                barClass: 'bg-blue-500',
                textColor: 'text-blue-400',
                desc: "How are the best performers on the leaderboard positioned? Their edge is built into your score.",
              },
              {
                icon: Users,
                color: 'purple',
                label: 'Community',
                weight: 25,
                barClass: 'bg-purple-500',
                textColor: 'text-purple-400',
                desc: 'Aggregate sentiment from the Conviction community. Contrarian or consensus — you decide.',
              },
            ].map(({ icon: Icon, color, label, weight, barClass, textColor, desc }, i) => {
              const bg = { emerald: 'bg-emerald-500/10', blue: 'bg-blue-500/10', purple: 'bg-purple-500/10' }[color]
              const border = { emerald: 'border-emerald-500/20', blue: 'border-blue-500/20', purple: 'border-purple-500/20' }[color]
              return (
                <FadeIn key={label} delay={i * 100}>
                  <div className="bg-[#111] border border-white/5 rounded-2xl p-6 h-full flex flex-col">
                    <div className={`w-12 h-12 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4 shrink-0`}>
                      <Icon className={`w-6 h-6 ${textColor}`} />
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-white font-black text-lg" style={SYNE}>{label}</span>
                      <span className={`text-sm font-bold ${textColor}`}>{weight}%</span>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed mb-5 flex-1">{desc}</p>
                    <StackBar value={weight} barClass={barClass} />
                  </div>
                </FadeIn>
              )
            })}
          </div>

          {/* Blended score visual */}
          <FadeIn>
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 w-full">
                <div className="text-gray-500 text-xs mb-3">Blended weight breakdown</div>
                <div className="flex h-3 rounded-full overflow-hidden gap-px">
                  {[
                    { w: 40, color: 'bg-emerald-500' },
                    { w: 35, color: 'bg-blue-500' },
                    { w: 25, color: 'bg-purple-500' },
                  ].map(({ w, color }, i) => (
                    <div key={i} className={`${color} h-full`} style={{ width: `${w}%` }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-5 mt-4">
                  {[
                    { label: 'AI Signal',   dot: 'bg-emerald-500', w: '40%' },
                    { label: 'Top Traders', dot: 'bg-blue-500',    w: '35%' },
                    { label: 'Community',   dot: 'bg-purple-500',  w: '25%' },
                  ].map(({ label, dot, w }) => (
                    <div key={label} className="flex items-center gap-2 text-sm text-gray-400">
                      <div className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
                      {label}
                      <span className="text-white font-semibold">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center md:text-right shrink-0 md:pl-6 md:border-l md:border-white/5">
                <div className="text-gray-500 text-xs mb-1">Blended result</div>
                <div className="text-5xl font-black text-emerald-400" style={SYNE}>72%</div>
                <div className="text-gray-500 text-sm mt-1">Conviction Score</div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 bg-[#0d0d0d] border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <FadeIn>
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/8 rounded-3xl blur-3xl pointer-events-none" />
              <div className="relative bg-[#111] border border-white/8 rounded-3xl p-12 lg:p-16">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-8">
                  <TrendingUp className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-4xl lg:text-5xl font-black mb-4 leading-tight" style={SYNE}>
                  Start trading with $10,000 in paper money.
                </h2>
                <p className="text-gray-400 text-lg mb-3">No credit card. No risk. Just conviction.</p>
                <p className="text-gray-600 text-sm mb-10">Paper trading only · No real money involved · Cancel anytime</p>
                <button
                  type="button"
                  onClick={openAuth}
                  className="inline-flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black px-10 py-5 rounded-xl transition-all text-lg shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30"
                  style={SYNE}
                >
                  Create Free Account <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10 px-6 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300 mb-1" style={SYNE}>
              Conviction
            </div>
            <p className="text-gray-600 text-xs">Built by Jackson Laskey · Conviction © 2026</p>
          </div>
          <div className="flex items-center gap-6 text-gray-500 text-sm">
            <a href="#" className="hover:text-white transition">About</a>
            <a href="#" className="hover:text-white transition">Terms</a>
            <a href="#" className="hover:text-white transition">Privacy</a>
          </div>
          <p className="text-gray-700 text-xs text-center md:text-right max-w-xs">
            Paper trading only. No real money involved. For educational purposes.
          </p>
        </div>
      </footer>

      {showAuth && <AuthModal onClose={closeAuth} onAuthSuccess={handleAuthSuccess} />}
    </div>
  )
}
