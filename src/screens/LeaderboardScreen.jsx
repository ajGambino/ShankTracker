import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildLeaderboardRows } from '../utils/leaderboard';
import { Link } from 'react-router-dom';

const TRIP_ID = 'destin-2026';

export default function LeaderboardScreen() {
	const [rows, setRows] = useState(null);
	const [error, setError] = useState(null);
	const [trip, setTrip] = useState(null);

	useEffect(() => {
		const fetchAll = async () => {
			try {
				const tripRef = doc(db, 'trips', TRIP_ID);
				const roundsRef = collection(db, 'trips', TRIP_ID, 'rounds');
				const playersRef = collection(db, 'trips', TRIP_ID, 'players');
				const scorecardsRef = collection(db, 'trips', TRIP_ID, 'scorecards');

				const [tripSnap, roundsSnap, playersSnap, scorecardsSnap] =
					await Promise.all([
						getDoc(tripRef),
						getDocs(roundsRef),
						getDocs(playersRef),
						getDocs(scorecardsRef),
					]);

				if (!tripSnap.exists()) {
					setError('Trip not found.');
					return;
				}

				const trip = { id: tripSnap.id, ...tripSnap.data() };
				setTrip(trip);
				const rounds = roundsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
				const players = playersSnap.docs.map((d) => ({
					id: d.id,
					...d.data(),
				}));
				const scorecards = scorecardsSnap.docs.map((d) => ({
					id: d.id,
					...d.data(),
				}));

				setRows(
					buildLeaderboardRows({
						players,
						rounds,
						scorecards,
						currentRoundId: trip.currentRoundId,
					}),
				);
			} catch (err) {
				setError(err.message);
			}
		};

		fetchAll();
	}, []);

	if (error) return <p>Error: {error}</p>;
	if (rows === null || trip === null) return <p>Loading...</p>;

	return (
		<section>
			<h1>Leaderboard</h1>
			<p>
				<Link to={`/round/${trip.currentRoundId}`}>Go to Current Round</Link>
			</p>
			<table>
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
