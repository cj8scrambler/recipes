import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import AdminDashboard from './components/AdminDashboard'
import UserView from './components/UserView'

export default function App() {
  return (
    <div className="app">
      <header>
        <div>
          <h1>Recipes</h1>
          <nav>
            <NavLink to="/" end>Browse Recipes</NavLink>
            <NavLink to="/admin">Admin Dashboard</NavLink>
          </nav>
        </div>
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
