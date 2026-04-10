import { Routes, Route } from 'react-router-dom'
import AppLayout from '../components/AppLayout.jsx'
import LeaderboardScreen from '../screens/LeaderboardScreen.jsx'
import RoundScreen from '../screens/RoundScreen.jsx'
import ScorecardScreen from '../screens/ScorecardScreen.jsx'
import PlayersScreen from '../screens/PlayersScreen.jsx'
import AdminScreen from '../screens/AdminScreen.jsx'
import NotFoundScreen from '../screens/NotFoundScreen.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LeaderboardScreen />} />
        <Route path="round/:roundId" element={<RoundScreen />} />
        <Route path="scorecard/:roundId/:playerId" element={<ScorecardScreen />} />
        <Route path="players" element={<PlayersScreen />} />
        <Route path="admin" element={<AdminScreen />} />
      </Route>
      {/* 404 is outside AppLayout intentionally — no nav on unknown routes */}
      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
  )
}
