import { useState } from 'react'
import { supabase } from './supabaseClient'

const Login = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        onAuthSuccess()
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        setError('Check your email for the confirmation link!')
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* APEX Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300 mb-2">
            APEX
          </div>
          <p className="text-gray-500 text-sm">Trading • Investing • Wealth</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
          <form className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-white text-sm font-semibold mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white px-4 py-3 rounded-lg focus:border-emerald-500 focus:outline-none transition"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-white text-sm font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white px-4 py-3 rounded-lg focus:border-emerald-500 focus:outline-none transition"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500 bg-opacity-20 border border-red-500 border-opacity-40 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              <button
                onClick={handleSignUp}
                disabled={loading}
                className="w-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-semibold py-3 rounded-lg transition"
              >
                {loading ? 'Signing Up...' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login