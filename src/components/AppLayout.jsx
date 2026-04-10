import { NavLink, Outlet } from 'react-router-dom'
import { PATHS } from '../routes/paths.js'
import '../styles/layout.css'

// Extracted so it's not recreated on every render
function navClass({ isActive }) {
  return isActive ? 'nav-link nav-link--active' : 'nav-link'
}

export default function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">ShankTracker</span>
      </header>

      <nav className="app-nav">
        {/* `end` prevents / from matching as prefix for all child routes */}
        <NavLink to={PATHS.LEADERBOARD} end className={navClass}>
          Leaderboard
        </NavLink>
        <NavLink to={PATHS.PLAYERS} className={navClass}>
          Players
        </NavLink>
        <NavLink to={PATHS.ADMIN} className={navClass}>
          Admin
        </NavLink>
      </nav>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
