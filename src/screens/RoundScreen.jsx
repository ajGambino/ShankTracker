import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildLeaderboardRows } from '../utils/leaderboard';
import { RoundPlayerCard } from '../components/PlayerCard';

const TRIP_ID = 'destin-2026';

const scoreClass = (raw) =>
	raw < 0 ? 'score-under' : raw > 0 ? 'score-over' : 'score-even';

const ROUND_COLUMNS = [
	{ key: 'rank', label: '#', sortable: true },
	{ key: 'name', label: 'Name', sortable: true },
	{ key: 'thru', label: 'Thru', sortable: true },
	{ key: 'todayRaw', label: 'Score', sortable: true },
	{ key: 'projectedRaw', label: 'Pace', sortable: true },
	{ key: 'scorecard', label: 'Scorecard', sortable: false },
];

function sortRoundRows(rows, col, dir) {
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

export default function RoundScreen() {
	const { roundId } = useParams();

	const [trip, setTrip] = useState(null);
	const [round, setRound] = useState(null);
	const [sortCol, setSortCol] = useState('todayRaw');
	const [sortDir, setSortDir] = useState('asc');
	const [rounds, setRounds] = useState([]);
	const [players, setPlayers] = useState([]);
	const [scorecards, setScorecards] = useState([]);
	const [error, setError] = useState(null);

	useEffect(() => {
		setError(null);

		const tripRef = doc(db, 'trips', TRIP_ID);
		const roundRef = doc(db, 'trips', TRIP_ID, 'rounds', roundId);
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

		const unsubRound = onSnapshot(
			roundRef,
			(snapshot) => {
				if (!snapshot.exists()) {
					setError('Round not found.');
					setRound(null);
					return;
				}
				setRound({ id: snapshot.id, ...snapshot.data() });
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
			unsubRound();
			unsubRounds();
			unsubPlayers();
			unsubScorecards();
		};
	}, [roundId]);

	if (error) {
		return (
			<section>
				<h1>Round</h1>
				<p className='error-msg'>{error}</p>
			</section>
		);
	}

	if (!trip || !round) {
		return (
			<section>
				<h1>Round</h1>
				<p className='text-muted loading-pulse'>Loading...</p>
			</section>
		);
	}

	const leaderboardRows = buildLeaderboardRows({
		players,
		rounds,
		scorecards,
		currentRoundId: roundId,
	});

	// roundRows establishes the round leaderboard rank (today → pace → name)
	const roundRows = [...leaderboardRows]
		.sort((a, b) => {
			if (a.todayRaw !== b.todayRaw) return a.todayRaw - b.todayRaw;
			if (a.projectedRaw !== b.projectedRaw)
				return a.projectedRaw - b.projectedRaw;
			return a.name.localeCompare(b.name);
		})
		.map((row, i) => ({ ...row, rank: i + 1 }));

	const displayRows = sortRoundRows(roundRows, sortCol, sortDir);

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
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
					<h2 style={{ margin: 0 }}>{round.name}</h2>
					<nav style={{ display: 'flex', gap: '0.25rem' }}>
						{[...rounds]
							.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
							.map((r, i) => (
								<Link
									key={r.id}
									to={`/round/${r.id}`}
									style={{
										fontSize: '0.78rem',
										fontWeight: 600,
										padding: '0.2rem 0.5rem',
										borderRadius: '6px',
										border: '1px solid var(--color-border)',
										background: r.id === roundId ? 'var(--color-nav-bg)' : '#fff',
										color: r.id === roundId ? '#fff' : 'var(--color-text-muted)',
										textDecoration: 'none',
									}}
								>
									R{i + 1}
								</Link>
							))}
					</nav>
				</div>

				{(round.date || round.teeTime) && (
					<p className='screen-meta'>
						{[round.date, round.teeTime && `Tee time: ${round.teeTime}`]
							.filter(Boolean)
							.join(' · ')}
					</p>
				)}
			</header>

			{Array.isArray(round.holePars) && round.holePars.length > 0 && (
				<section className='section-card'>
					<h2>{round.courseName}</h2>
					<div style={{ overflowX: 'auto' }}>
						<table className='data-table' style={{ minWidth: 'max-content' }}>
							<thead>
								<tr>
									<th>Hole</th>
									{round.holePars.map((_, i) => (
										<th key={i} style={{ textAlign: 'center' }}>
											{i + 1}
										</th>
									))}
									<th style={{ textAlign: 'center' }}>Tot</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td className='text-muted text-sm'>Par</td>
									{round.holePars.map((par, i) => (
										<td key={i} style={{ textAlign: 'center' }}>
											{par}
										</td>
									))}
									<td style={{ textAlign: 'center', fontWeight: 600 }}>
										{round.totalPar}
									</td>
								</tr>
								{Array.isArray(round.holeYardages) &&
									round.holeYardages.length === round.holePars.length && (
										<tr>
											<td className='text-muted text-sm'>Yds</td>
											{round.holeYardages.map((yds, i) => (
												<td key={i} style={{ textAlign: 'center' }}>
													{yds}
												</td>
											))}
											<td style={{ textAlign: 'center', fontWeight: 600 }}>
												{round.holeYardages.reduce((a, b) => a + b, 0)}
											</td>
										</tr>
									)}
							</tbody>
						</table>
					</div>
				</section>
			)}

			<section className='section-card'>
				<h2> Leaderboard</h2>
				<div className='leaderboard-table-wrap'>
					<table className='data-table'>
						<thead>
							<tr>
								{ROUND_COLUMNS.map((col) =>
									col.sortable ? (
										<th
											key={col.key}
											onClick={() => handleSort(col.key)}
											className='sortable-th'
											style={{ cursor: 'pointer', userSelect: 'none' }}
										>
											{col.label} <SortIndicator colKey={col.key} />
										</th>
									) : (
										<th key={col.key}>{col.label}</th>
									),
								)}
							</tr>
						</thead>
						<tbody>
							{displayRows.map((row) => (
								<tr key={row.playerId}>
									<td className='text-muted'>{row.rank}</td>
									<td>{row.name}</td>
									<td className='text-muted'>
										{' '}
										{row.isFinished ? 'F' : row.thru}
									</td>
									<td className={scoreClass(row.todayRaw)}>
										{row.todayDisplay}
									</td>
									<td className={scoreClass(row.projectedRaw)}>
										{row.projectedDisplay}
									</td>
									<td>
										<Link
											to={`/scorecard/${round.id}/${row.playerId}`}
											className='text-sm'
										>
											Open →
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className='player-cards'>
					{displayRows.map((row) => (
						<RoundPlayerCard key={row.playerId} row={row} roundId={round.id} />
					))}
				</div>
			</section>
		</section>
	);
}
