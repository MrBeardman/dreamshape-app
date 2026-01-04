import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface AuthViewProps {
  onAuthSuccess: () => void
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

  const SIGNUP_CODE = 'BIGIISTHEBEST'

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    // Check signup code
    if (signupCode !== SIGNUP_CODE) {
      setError('Invalid signup code. DreamShape is currently in testing.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || 'User',
          role: email.toLowerCase().includes('bigi') ? 'creator' : 'member' // Mark Bigi as creator
        }
      }
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email to confirm your account!')
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      onAuthSuccess()
    }
  }

  return (
    <div className="auth-view">
      <div className="auth-container">
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
      </div>
    </div>
  )
}