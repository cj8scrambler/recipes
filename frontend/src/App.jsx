import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import AdminDashboard from './components/AdminDashboard'
import UserView from './components/UserView'

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>Recipes</h1>
        <nav>
          <Link to="/">User View</Link>
          <Link to="/admin">Admin</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<UserView />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
    </div>
  )
}
