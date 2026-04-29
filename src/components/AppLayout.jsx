import { NavLink, Outlet } from 'react-router-dom';
import { PATHS } from '../routes/paths.js';
import '../styles/layout.css';

function navClass({ isActive }) {
	return isActive ? 'nav-link nav-link--active' : 'nav-link';
}

export default function AppLayout() {
	return (
		<div className='app-shell'>
			<header className='app-header'>
				<span className='app-title'>ShankTracker</span>
			</header>

			<nav className='app-nav'>
				<NavLink to={PATHS.LEADERBOARD} end className={navClass}>
					Leaderboard
				</NavLink>
			</nav>

			<main className='app-content'>
				<Outlet />
			</main>
		</div>
	);
}
