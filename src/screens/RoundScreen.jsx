import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildLeaderboardRows } from '../utils/leaderboard';

const TRIP_ID = 'destin-2026';

export default function RoundScreen() {
	const { roundId } = useParams();

	const [trip, setTrip] = useState(null);
	const [round, setRound] = useState(null);
	const [rows, setRows] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchRoundData = async () => {
			try {
				setError(null);

				const tripRef = doc(db, 'trips', TRIP_ID);
				const roundRef = doc(db, 'trips', TRIP_ID, 'rounds', roundId);
				const roundsRef = collection(db, 'trips', TRIP_ID, 'rounds');
				const playersRef = collection(db, 'trips', TRIP_ID, 'players');
				const scorecardsRef = collection(db, 'trips', TRIP_ID, 'scorecards');

				const [tripSnap, roundSnap, roundsSnap, playersSnap, scorecardsSnap] =
					await Promise.all([
						getDoc(tripRef),
						getDoc(roundRef),
						getDocs(roundsRef),
						getDocs(playersRef),
						getDocs(scorecardsRef),
					]);

				if (!tripSnap.exists()) {
					setError('Trip not found.');
					return;
				}

				if (!roundSnap.exists()) {
					setError('Round not found.');
					return;
				}

				const tripData = { id: tripSnap.id, ...tripSnap.data() };
				const roundData = { id: roundSnap.id, ...roundSnap.data() };
				const rounds = roundsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
				const players = playersSnap.docs.map((d) => ({
					id: d.id,
					...d.data(),
				}));
				const scorecards = scorecardsSnap.docs.map((d) => ({
					id: d.id,
					...d.data(),
				}));

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

				setTrip(tripData);
				setRound(roundData);
				setRows(roundRows);
			} catch (err) {
				setError(err.message || 'Something went wrong.');
			}
		};

		fetchRoundData();
	}, [roundId]);

	if (error) {
		return (
			<section>
				<h1>Round</h1>
				<p>Error: {error}</p>
			</section>
		);
	}

	if (!round || !rows || !trip) {
		return (
			<section>
				<h1>Round</h1>
				<p>Loading...</p>
			</section>
		);
	}

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
						<table>
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
				<table>
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
						{rows.map((row, index) => (
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
