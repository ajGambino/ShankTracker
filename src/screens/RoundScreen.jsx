import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildLeaderboardRows } from '../utils/leaderboard';

const TRIP_ID = 'destin-2026';

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
				<p>Error: {error}</p>
			</section>
		);
	}

	if (!trip || !round) {
		return (
			<section>
				<h1>Round</h1>
				<p>Loading...</p>
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
			<header>
				<h1>{round.name}</h1>
				<p>{round.courseName}</p>
				{round.date ? <p>Date: {round.date}</p> : null}
				{round.teeTime ? <p>Tee Time: {round.teeTime}</p> : null}
				<p>Trip: {trip.name}</p>
			</header>

			{Array.isArray(round.holePars) && round.holePars.length > 0 ? (
				<section>
					<h2>Hole Pars</h2>
					<div style={{ overflowX: 'auto' }}>
						<table cellPadding='8'>
							<thead>
								<tr>
									{round.holePars.map((_, index) => (
										<th key={`hole-${index + 1}`}>{index + 1}</th>
									))}
									<th>Total</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									{round.holePars.map((par, index) => (
										<td key={`par-${index + 1}`}>{par}</td>
									))}
									<td>{round.totalPar}</td>
								</tr>
							</tbody>
						</table>
					</div>
				</section>
			) : null}

			<section>
				<h2>Round Leaderboard</h2>
				<table cellPadding='8'>
					<thead>
						<tr>
							<th>#</th>
							<th>Name</th>
							<th>Thru</th>
							<th>Today</th>
							<th>Proj</th>
							<th>Scorecard</th>
						</tr>
					</thead>
					<tbody>
						{roundRows.map((row, index) => (
							<tr key={row.playerId}>
								<td>{index + 1}</td>
								<td>{row.name}</td>
								<td>{row.isFinished ? 'F' : row.thru}</td>
								<td>{row.todayDisplay}</td>
								<td>{row.projectedDisplay}</td>
								<td>
									<Link to={`/scorecard/${round.id}/${row.playerId}`}>
										Open
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
