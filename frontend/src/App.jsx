import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { api } from './api'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import UserView from './components/UserView'
import Settings from './components/Settings'
import RecipeLists from './components/RecipeLists'

// Test database warning banner component
function TestDatabaseBanner() {
  return (
    <div style={{
      background: '#f59e0b',
      color: '#1f2937',
      padding: '0.5rem 1rem',
      textAlign: 'center',
      fontWeight: 600,
      fontSize: '0.9rem',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      ⚠️ TEST DATABASE - This is not production data
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isTestDb, setIsTestDb] = useState(false)

  useEffect(() => {
    checkTestDatabase()
    checkAuth()
  }, [])

  async function checkTestDatabase() {
    try {
      const result = await api.isTestDatabase()
      setIsTestDb(result.is_test === true)
    } catch (err) {
      // If check fails, assume not test database
      console.error('Failed to check test database:', err)
      setIsTestDb(false)
    }
  }

  async function checkAuth() {
    try {
      const userData = await api.getMe()
      setUser(userData)
    } catch (err) {
      // Not logged in
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(userData) {
    setUser(userData)
  }

  async function handleLogout() {
    try {
      await api.logout()
      setUser(null)
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="app loading">
        {isTestDb && <TestDatabaseBanner />}
        <p>Loading...</p>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!user) {
    return (
      <div className="app">
        {isTestDb && <TestDatabaseBanner />}
        <Login onLogin={handleLogin} />
      </div>
    )
  }

  // Authenticated - show main app
  return (
    <div className="app">
      {isTestDb && <TestDatabaseBanner />}
      <header>
        <div>
          <h1>Recipes</h1>
          <nav>
            <NavLink to="/" end>Browse Recipes</NavLink>
            <NavLink to="/my-lists">My Lists</NavLink>
            {user.role === 'admin' && (
              <NavLink to="/admin">Admin Dashboard</NavLink>
            )}
            <NavLink to="/settings">Settings</NavLink>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<UserView user={user} />} />
          <Route path="/my-lists" element={<RecipeLists user={user} />} />
          <Route path="/settings" element={<Settings user={user} />} />
          {user.role === 'admin' ? (
            <Route path="/admin" element={<AdminDashboard />} />
          ) : (
            <Route path="/admin" element={<Navigate to="/" replace />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
