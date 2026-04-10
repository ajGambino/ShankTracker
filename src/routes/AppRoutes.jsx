import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout.jsx';
import JoinScreen from '../screens/JoinScreen.jsx';
import LeaderboardScreen from '../screens/LeaderboardScreen.jsx';
import RoundScreen from '../screens/RoundScreen.jsx';
import ScorecardScreen from '../screens/ScorecardScreen.jsx';
import PlayersScreen from '../screens/PlayersScreen.jsx';
import AdminScreen from '../screens/AdminScreen.jsx';
import NotFoundScreen from '../screens/NotFoundScreen.jsx';

export default function AppRoutes() {
	const { user, loading, currentPlayer, isAdmin } = useAuth();

	if (loading) {
		return <p style={{ padding: '2rem' }}>Loading...</p>;
	}

	if (!user || !currentPlayer) {
		return <JoinScreen />;
	}

	return (
		<Routes>
			<Route element={<AppLayout />}>
				<Route index element={<LeaderboardScreen />} />
				<Route path='round/:roundId' element={<RoundScreen />} />
				<Route
					path='scorecard/:roundId/:playerId'
					element={<ScorecardScreen />}
				/>
				<Route path='players' element={<PlayersScreen />} />
				<Route
					path='admin'
					element={isAdmin ? <AdminScreen /> : <LeaderboardScreen />}
				/>
			</Route>
			{/* 404 is outside AppLayout intentionally — no nav on unknown routes */}
			<Route path='*' element={<NotFoundScreen />} />
		</Routes>
	);
}
