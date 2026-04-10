import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildLeaderboardRows } from '../utils/leaderboard';

const TRIP_ID = 'destin-2026';

export default function LeaderboardScreen() {
	const [trip, setTrip] = useState(null);
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
				<p>Error: {error}</p>
			</section>
		);
	}

	if (!trip) {
		return (
			<section>
				<h1>Leaderboard</h1>
				<p>Loading...</p>
			</section>
		);
	}

	const rows = buildLeaderboardRows({
		players,
		rounds,
		scorecards,
		currentRoundId: trip.currentRoundId,
	});

	return (
		<section>
			<h1>Leaderboard</h1>

			<p>
				<Link to={`/round/${trip.currentRoundId}`}>View Current Round</Link>
			</p>

			<table cellPadding='8'>
				<thead>
					<tr>
						<th>#</th>
						<th>Name</th>
						<th>Total</th>
						<th>Thru</th>
						<th>Today</th>
						<th>Proj</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row, index) => (
						<tr key={row.playerId}>
							<td>{index + 1}</td>
							<td>{row.name}</td>
							<td>{row.totalDisplay}</td>
							<td>{row.isFinished ? 'F' : row.thru}</td>
							<td>{row.todayDisplay}</td>
							<td>{row.projectedDisplay}</td>
						</tr>
					))}
				</tbody>
			</table>
		</section>
	);
}
