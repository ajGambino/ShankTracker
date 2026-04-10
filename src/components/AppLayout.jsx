import { NavLink, Outlet } from 'react-router-dom';
import { PATHS } from '../routes/paths.js';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../lib/auth';
import '../styles/layout.css';

function navClass({ isActive }) {
	return isActive ? 'nav-link nav-link--active' : 'nav-link';
}

export default function AppLayout() {
	const { currentPlayer, isAdmin, setTripId } = useAuth();

	const handleSignOut = async () => {
		await signOut();
		setTripId(null);
	};

	return (
		<div className='app-shell'>
			<header className='app-header'>
				<span className='app-title'>ShankTracker</span>
				{currentPlayer && (
					<span style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>
						{currentPlayer.name} ·{' '}
						<button
							onClick={handleSignOut}
							style={{
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								textDecoration: 'underline',
								padding: 0,
								fontSize: 'inherit',
								color: 'inherit',
							}}
						>
							Sign out
						</button>
					</span>
				)}
			</header>

			<nav className='app-nav'>
				<NavLink to={PATHS.LEADERBOARD} end className={navClass}>
					Leaderboard
				</NavLink>
				{isAdmin && (
					<NavLink to={PATHS.ADMIN} className={navClass}>
						Admin
					</NavLink>
				)}
			</nav>

			<main className='app-content'>
				<Outlet />
			</main>
		</div>
	);
}
