import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildLeaderboardRows } from '../utils/leaderboard';

const TRIP_ID = 'destin-2026';

const scoreClass = (raw) =>
	raw < 0 ? 'score-under' : raw > 0 ? 'score-over' : 'score-even';

export default function RoundScreen() {
	const { roundId } = useParams();

	const [trip, setTrip] = useState(null);
	const [round, setRound] = useState(null);
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

	const roundRows = [...leaderboardRows].sort((a, b) => {
		if (a.todayRaw !== b.todayRaw) {
			return a.todayRaw - b.todayRaw;
		}

		if (a.projectedRaw !== b.projectedRaw) {
			return a.projectedRaw - b.projectedRaw;
		}

		return a.name.localeCompare(b.name);
	});

	return (
		<section>
			<header style={{ marginBottom: '1.25rem' }}>
				<h1>{round.name}</h1>
				<p className='screen-meta'>{round.courseName}</p>
				{(round.date || round.teeTime) && (
					<p className='screen-meta'>
						{[round.date, round.teeTime && `Tee ${round.teeTime}`]
							.filter(Boolean)
							.join(' · ')}
					</p>
				)}
				{trip.name && <p className='screen-meta'>Trip: {trip.name}</p>}
			</header>

			{Array.isArray(round.holePars) && round.holePars.length > 0 && (
				<section className='section-card'>
					<h2>Course</h2>
					<div style={{ overflowX: 'auto' }}>
						<table className='data-table' style={{ minWidth: 'max-content' }}>
							<thead>
								<tr>
									<th>Hole</th>
									{round.holePars.map((_, i) => (
										<th key={i} style={{ textAlign: 'center' }}>{i + 1}</th>
									))}
									<th style={{ textAlign: 'center' }}>Tot</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td className='text-muted text-sm'>Par</td>
									{round.holePars.map((par, i) => (
										<td key={i} style={{ textAlign: 'center' }}>{par}</td>
									))}
									<td style={{ textAlign: 'center', fontWeight: 600 }}>{round.totalPar}</td>
								</tr>
								{Array.isArray(round.holeYardages) && round.holeYardages.length === round.holePars.length && (
									<tr>
										<td className='text-muted text-sm'>Yds</td>
										{round.holeYardages.map((yds, i) => (
											<td key={i} style={{ textAlign: 'center' }}>{yds}</td>
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
				<h2>Round Leaderboard</h2>
				<table className='data-table'>
					<thead>
						<tr>
							<th>#</th>
							<th>Name</th>
							<th>Thru</th>
							<th>Today</th>
							<th>Pace</th>
							<th>Scorecard</th>
						</tr>
					</thead>
					<tbody>
						{roundRows.map((row, index) => (
							<tr key={row.playerId}>
								<td className='text-muted'>{index + 1}</td>
								<td>{row.name}</td>
								<td className='text-muted'>{row.isFinished ? 'F' : row.thru}</td>
								<td className={scoreClass(row.todayRaw)}>{row.todayDisplay}</td>
								<td className={scoreClass(row.projectedRaw)}>{row.projectedDisplay}</td>
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
			</section>
		</section>
	);
}
