import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildLeaderboardRows, formatRelativeScore } from '../utils/leaderboard';

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

	const sortedRounds = [...rounds].sort(
		(a, b) => (a.order ?? 0) - (b.order ?? 0),
	);
	const effectiveRoundId = trip.currentRoundId ?? sortedRounds[0]?.id ?? null;

	// rows is already sorted by totalRaw (leaderboard rank)
	const rows = buildLeaderboardRows({
		players,
		rounds,
		scorecards,
		currentRoundId: effectiveRoundId,
	}).map((row, i) => ({ ...row, rank: i + 1 }));

	const displayRows = sortRows(rows, sortCol, sortDir);

	const playerTeamMap = Object.fromEntries(players.map((p) => [p.id, p.team ?? '']));
	const teamTotals = rows.reduce(
		(acc, row) => {
			const team = playerTeamMap[row.playerId];
			if (team === 'team1') acc.team1 += row.totalRaw;
			if (team === 'team2') acc.team2 += row.totalRaw;
			return acc;
		},
		{ team1: 0, team2: 0 },
	);
	const hasTeams = players.some((p) => p.team === 'team1' || p.team === 'team2');

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
				<h1>Soak Invitational 2026</h1>
				{effectiveRoundId && (
					<Link to={`/round/${effectiveRoundId}`} className='text-sm'>
						View Round →
					</Link>
				)}
			</header>

			<div className='section-card' style={{ marginBottom: '1rem' }}>
				<h2 style={{ marginTop: 0 }}>Team Standings</h2>
				<table className='data-table'>
					<thead>
						<tr>
							<th>#</th>
							<th>Team</th>
							<th>Score</th>
						</tr>
					</thead>
					<tbody>
						{[
							{ label: 'Team 1', score: teamTotals.team1 },
							{ label: 'Team 2', score: teamTotals.team2 },
						]
							.sort((a, b) => a.score - b.score)
							.map((team, i) => (
								<tr key={team.label}>
									<td className='text-muted'>{i + 1}</td>
									<td>{team.label}</td>
									<td className={scoreClass(team.score)}>
										{formatRelativeScore(team.score, { decimals: 1 })}
									</td>
								</tr>
							))}
					</tbody>
				</table>
			</div>

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
