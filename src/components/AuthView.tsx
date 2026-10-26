import { useState } from 'react'
import { motion } from 'motion/react'
import { signIn, signUp } from '../lib/auth'
import type { AuthUser } from '../types'

interface AuthViewProps {
  onAuthSuccess: (user: AuthUser) => void
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [signupCode, setSignupCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // The signup code is checked on the server (AUTH_SIGNUP_CODE); sign-up is off when it is not set.
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      // All new signups are testers (set server-side). No confirmation email: the account is ready at once.
      const user = await signUp({ email, password, name: name || 'User', signupCode })
      setLoading(false)
      onAuthSuccess(user)
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : 'Sign up failed')
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const user = await signIn(email, password)
      setLoading(false)
      onAuthSuccess(user)
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : 'Sign in failed')
    }
  }

  return (
    <div className="auth-view">
      <motion.div
        className="auth-container"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="auth-header">
          <h1 className="auth-logo">💪 DreamShape</h1>
          <p className="auth-tagline">Track your fitness journey</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setMode('signin')
              setError(null)
              setMessage(null)
            }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setMode('signup')
              setError(null)
              setMessage(null)
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="auth-form">
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
            {mode === 'signup' && (
              <p className="form-hint">At least 6 characters</p>
            )}
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="signupCode">Signup Code 🔑</label>
              <input
                id="signupCode"
                type="text"
                placeholder="Enter signup code"
                value={signupCode}
                onChange={(e) => setSignupCode(e.target.value.toUpperCase())}
                required
                disabled={loading}
              />
              <p className="form-hint">App is in testing - code required</p>
            </div>
          )}

          {error && (
            <div className="auth-error">
              ⚠️ {error}
            </div>
          )}

          {message && (
            <div className="auth-message">
              ✅ {message}
            </div>
          )}

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-footer-text">
            {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
            <button
              className="btn-auth-switch"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(null)
                setMessage(null)
              }}
              disabled={loading}
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}