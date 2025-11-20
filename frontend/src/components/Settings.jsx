import React, { useState, useEffect } from 'react'
import { api } from '../api'

export default function Settings({ user }) {
  const [settings, setSettings] = useState({ unit: 'us' })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const data = await api.getSettings()
      setSettings(data)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  async function handleUpdateSettings(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      await api.updateSettings(settings)
      setMessage('Settings updated successfully')
    } catch (err) {
      setError(err.message || 'Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setMessage('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-container">
      <h2>Settings</h2>

      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h3>User Information</h3>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role}</p>
      </div>

      <div className="card">
        <h3>Preferences</h3>
        <form onSubmit={handleUpdateSettings}>
          <div className="form-group">
            <label htmlFor="unit">Unit System</label>
            <select
              id="unit"
              value={settings.unit || 'us'}
              onChange={(e) => setSettings({ ...settings, unit: e.target.value })}
            >
              <option value="us">US Customary</option>
              <option value="metric">Metric</option>
            </select>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Change Password</h3>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
