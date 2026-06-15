import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'

export default function Register({ onLogin }) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [tokenValid, setTokenValid] = useState(null)  // null = checking
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      return
    }
    api.validateInviteToken(token)
      .then(data => setTokenValid(data.valid))
      .catch(() => setTokenValid(false))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const userData = await api.register(token, email, password)
      onLogin(userData)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Recipes</h1>
        <h2>Create Account</h2>

        {tokenValid === null && (
          <p>Validating invite link...</p>
        )}

        {tokenValid === false && (
          <div className="error">
            This invite link is invalid or has expired. Please ask an admin for a new one.
          </div>
        )}

        {tokenValid === true && (
          <>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength="6"
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
