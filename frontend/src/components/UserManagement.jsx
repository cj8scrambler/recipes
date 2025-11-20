import React, { useState } from 'react'
import { api } from '../api'

export default function UserManagement({ users, onRefresh }) {
  const [editingUser, setEditingUser] = useState(null)
  const [creatingUser, setCreatingUser] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'user' })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function handleCreateUser(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      await api.adminCreateUser(newUser)
      setSuccess('User created successfully')
      setNewUser({ email: '', password: '', role: 'user' })
      setCreatingUser(false)
      await onRefresh()
    } catch (err) {
      setError(err.message || 'Failed to create user')
    }
  }

  async function handleToggleRole(user) {
    setError(null)
    setSuccess(null)

    const newRole = user.role === 'admin' ? 'user' : 'admin'
    try {
      await api.adminUpdateUser(user.id, { role: newRole })
      setSuccess(`User role changed to ${newRole}`)
      await onRefresh()
    } catch (err) {
      setError(err.message || 'Failed to update user role')
    }
  }

  async function handleDeleteUser(user) {
    if (!confirm(`Delete user ${user.email}? This action cannot be undone.`)) return
    setError(null)
    setSuccess(null)

    try {
      await api.adminDeleteUser(user.id)
      setSuccess('User deleted successfully')
      await onRefresh()
    } catch (err) {
      setError(err.message || 'Failed to delete user')
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Manage Users</h3>
        <button onClick={() => setCreatingUser(!creatingUser)}>
          {creatingUser ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {creatingUser && (
        <div className="card" style={{ margin: '1rem', background: 'var(--bg-tertiary)' }}>
          <h4>Create New User</h4>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label htmlFor="new-email">Email</label>
              <input
                id="new-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
                placeholder="user@example.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-password">Password</label>
              <input
                id="new-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                minLength="6"
                placeholder="At least 6 characters"
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-role">Account Type</label>
              <select
                id="new-role"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="user">Regular User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit">Create User</button>
              <button type="button" className="secondary" onClick={() => setCreatingUser(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {users.length === 0 && (
        <div className="empty-state">
          <p>No users found.</p>
        </div>
      )}

      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <div>
              <div>
                <strong>{user.email}</strong>
                <span
                  style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    background: user.role === 'admin' ? 'var(--primary-light)' : 'var(--gray-200)',
                    borderRadius: 'var(--border-radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}
                >
                  {user.role}
                </span>
              </div>
              <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Created: {new Date(user.created_at).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="small secondary"
                onClick={() => handleToggleRole(user)}
                title={user.role === 'admin' ? 'Remove admin privileges' : 'Grant admin privileges'}
              >
                {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
              </button>
              <button
                className="small danger"
                onClick={() => handleDeleteUser(user)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
