import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildLeaderboardRows } from '../utils/leaderboard';

const TRIP_ID = 'destin-2026';

const scoreClass = (raw) =>
	raw < 0 ? 'score-under' : raw > 0 ? 'score-over' : 'score-even';

const COLUMNS = [
	{ key: 'rank', label: '#' },
	{ key: 'name', label: 'Name' },
	{ key: 'totalRaw', label: 'Total' },
	{ key: 'thru', label: 'Thru' },
	{ key: 'projectedRaw', label: 'Today' },
];

function sortRows(rows, col, dir) {
	return [...rows].sort((a, b) => {
		const av = a[col];
		const bv = b[col];
		if (av == null && bv == null) return 0;
		if (av == null) return 1;
		if (bv == null) return -1;
		const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
		return dir === 'asc' ? cmp : -cmp;
	});
}

export default function LeaderboardScreen() {
	const [trip, setTrip] = useState(null);
	const [sortCol, setSortCol] = useState('totalRaw');
	const [sortDir, setSortDir] = useState('asc');
	const [rounds, setRounds] = useState([]);
	const [players, setPlayers] = useState([]);
	const [scorecards, setScorecards] = useState([]);
	const [error, setError] = useState(null);

	useEffect(() => {
		setError(null);

		const tripRef = doc(db, 'trips', TRIP_ID);
		const roundsRef = collection(db, 'trips', TRIP_ID, 'rounds');
		const playersRef = collection(db, 'trips', TRIP_ID, 'players');
		const scorecardsRef = collection(db, 'trips', TRIP_ID, 'scorecards');

		const unsubTrip = onSnapshot(
			tripRef,
			(snapshot) => {
				if (!snapshot.exists()) {
					setError('Trip not found.');
					setTrip(null);
					return;
				}

				setTrip({ id: snapshot.id, ...snapshot.data() });
			},
			(err) => setError(err.message),
		);

		const unsubRounds = onSnapshot(
			roundsRef,
			(snapshot) => {
				setRounds(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
			},
			(err) => setError(err.message),
		);

		const unsubPlayers = onSnapshot(
			playersRef,
			(snapshot) => {
				setPlayers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
			},
			(err) => setError(err.message),
		);

		const unsubScorecards = onSnapshot(
			scorecardsRef,
			(snapshot) => {
				setScorecards(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
			},
			(err) => setError(err.message),
		);

		return () => {
			unsubTrip();
			unsubRounds();
			unsubPlayers();
			unsubScorecards();
		};
	}, []);

	if (error) {
		return (
			<section>
				<h1>Leaderboard</h1>
				<p className='error-msg'>{error}</p>
			</section>
		);
	}

	if (!trip) {
		return (
			<section>
				<h1>Leaderboard</h1>
				<p className='text-muted loading-pulse'>Loading...</p>
			</section>
		);
	}

	// rows is already sorted by totalRaw (leaderboard rank)
	const rows = buildLeaderboardRows({
		players,
		rounds,
		scorecards,
		currentRoundId: trip.currentRoundId,
	}).map((row, i) => ({ ...row, rank: i + 1 }));

	const displayRows = sortRows(rows, sortCol, sortDir);

	function handleSort(key) {
		if (key === sortCol) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortCol(key);
			setSortDir('asc');
		}
	}

	function SortIndicator({ colKey }) {
		if (colKey !== sortCol)
			return <span className='sort-indicator sort-inactive'>↕</span>;
		return (
			<span className='sort-indicator'>{sortDir === 'asc' ? '↑' : '↓'}</span>
		);
	}

	return (
		<section>
			<header style={{ marginBottom: '1.25rem' }}>
				<h1>Beast Open 2026</h1>
				<Link to={`/round/${trip.currentRoundId}`} className='text-sm'>
					View Current Round →
				</Link>
			</header>

			<div className='section-card'>
				<table className='data-table'>
					<thead>
						<tr>
							{COLUMNS.map((col) => (
								<th
									key={col.key}
									onClick={() => handleSort(col.key)}
									className='sortable-th'
									style={{ cursor: 'pointer', userSelect: 'none' }}
								>
									{col.label} <SortIndicator colKey={col.key} />
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{displayRows.map((row) => (
							<tr key={row.playerId}>
								<td className='text-muted'>{row.rank}</td>
								<td>{row.name}</td>
								<td className={scoreClass(row.totalRaw)}>{row.totalDisplay}</td>
								<td className='text-muted'>
									{row.isFinished ? 'F' : row.thru}
								</td>
								<td className={scoreClass(row.projectedRaw)}>
									{row.projectedDisplay}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
