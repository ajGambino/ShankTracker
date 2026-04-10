import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
	sumHoleScores,
	countCompletedHoles,
	getExpectedSoFar,
	getProjectedRoundTotal,
	getCurrentRelativeScore,
	getProjectedRelativeScore,
	formatRelativeScore,
} from '../utils/leaderboard';

const TRIP_ID = 'destin-2026';

function createEmptyHoleScores() {
	return Array(18).fill(null);
}

function normalizeHoleScores(holeScores) {
	if (!Array.isArray(holeScores)) {
		return createEmptyHoleScores();
	}

	const normalized = holeScores.slice(0, 18);

	while (normalized.length < 18) {
		normalized.push(null);
	}

	return normalized.map((score) => (typeof score === 'number' ? score : null));
}

export default function ScorecardScreen() {
	const { roundId, playerId } = useParams();

	const [round, setRound] = useState(null);
	const [player, setPlayer] = useState(null);
	const [holeScores, setHoleScores] = useState(createEmptyHoleScores());
	const [draftScores, setDraftScores] = useState(createEmptyHoleScores());
	const [isExistingScorecard, setIsExistingScorecard] = useState(false);
	const [loading, setLoading] = useState(true);
	const [savingHole, setSavingHole] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!roundId || !playerId) return;

		setLoading(true);

		const roundRef = doc(db, 'trips', TRIP_ID, 'rounds', roundId);
		const playerRef = doc(db, 'trips', TRIP_ID, 'players', playerId);
		const scorecardRef = doc(
			db,
			'trips',
			TRIP_ID,
			'scorecards',
			`${roundId}_${playerId}`,
		);

		let loaded = {
			round: false,
			player: false,
			scorecard: false,
		};

		const checkLoaded = () => {
			if (loaded.round && loaded.player && loaded.scorecard) {
				setLoading(false);
			}
		};

		const unsubRound = onSnapshot(roundRef, (snap) => {
			if (snap.exists()) {
				setRound({ id: snap.id, ...snap.data() });
			}
			loaded.round = true;
			checkLoaded();
		});

		const unsubPlayer = onSnapshot(playerRef, (snap) => {
			if (snap.exists()) {
				setPlayer({ id: snap.id, ...snap.data() });
			}
			loaded.player = true;
			checkLoaded();
		});

		const unsubScorecard = onSnapshot(scorecardRef, (snap) => {
			if (snap.exists()) {
				const existingScores = normalizeHoleScores(snap.data().holeScores);

				setHoleScores(existingScores);
				setDraftScores(existingScores.map((score) => (score ?? '').toString()));
				setIsExistingScorecard(true);
			} else {
				const emptyScores = createEmptyHoleScores();
				setHoleScores(emptyScores);
				setDraftScores(emptyScores.map(() => ''));
				setIsExistingScorecard(false);
			}

			loaded.scorecard = true;
			checkLoaded();
		});

		return () => {
			unsubRound();
			unsubPlayer();
			unsubScorecard();
		};
	}, [roundId, playerId]);

	const stats = useMemo(() => {
		if (!round || !player) {
			return null;
		}

		const actualTotal = sumHoleScores(holeScores);
		const thru = countCompletedHoles(holeScores);
		const expectedSoFar = getExpectedSoFar(
			player.declaredAverage,
			round.totalPar,
			round.holePars,
			holeScores,
		);
		const projectedTotal = getProjectedRoundTotal(
			player.declaredAverage,
			round.totalPar,
			round.holePars,
			holeScores,
		);

		const isFinished = thru === 18;

		const currentRelative = isFinished
			? actualTotal - player.declaredAverage
			: getCurrentRelativeScore(
					player.declaredAverage,
					round.totalPar,
					round.holePars,
					holeScores,
				);

		const projectedRelative = isFinished
			? currentRelative
			: getProjectedRelativeScore(
					player.declaredAverage,
					round.totalPar,
					round.holePars,
					holeScores,
				);

		return {
			actualTotal,
			thru,
			expectedSoFar,
			projectedTotal,
			currentRelative,
			projectedRelative,
			isFinished,
		};
	}, [round, player, holeScores]);

	const handleDraftChange = (holeIndex, value) => {
		if (value === '') {
			setDraftScores((prev) => {
				const next = [...prev];
				next[holeIndex] = '';
				return next;
			});
			return;
		}

		if (!/^\d+$/.test(value)) {
			return;
		}

		setDraftScores((prev) => {
			const next = [...prev];
			next[holeIndex] = value;
			return next;
		});
	};

	const saveHoleScore = async (holeIndex) => {
		if (!round || !player) return;

		const rawValue = draftScores[holeIndex];
		const parsed = rawValue === '' ? null : Number.parseInt(rawValue, 10);

		if (
			parsed !== null &&
			(Number.isNaN(parsed) || parsed < 1 || parsed > 15)
		) {
			setError('Score must be between 1 and 15.');
			setDraftScores((prev) => {
				const next = [...prev];
				next[holeIndex] =
					holeScores[holeIndex] == null ? '' : String(holeScores[holeIndex]);
				return next;
			});
			return;
		}

		if (parsed === holeScores[holeIndex]) {
			return;
		}

		const previousHoleScores = [...holeScores];
		const nextHoleScores = [...holeScores];
		nextHoleScores[holeIndex] = parsed;

		const nextActualTotal = sumHoleScores(nextHoleScores);
		const nextHolesCompleted = countCompletedHoles(nextHoleScores);

		setHoleScores(nextHoleScores);
		setSavingHole(holeIndex);
		setError(null);

		const scorecardId = `${roundId}_${playerId}`;
		const scorecardRef = doc(db, 'trips', TRIP_ID, 'scorecards', scorecardId);

		const payload = {
			roundId,
			playerId,
			holeScores: nextHoleScores,
			holesCompleted: nextHolesCompleted,
			actualTotal: nextActualTotal,
		};

		try {
			if (isExistingScorecard) {
				await updateDoc(scorecardRef, payload);
			} else {
				await setDoc(scorecardRef, payload);
				setIsExistingScorecard(true);
			}
		} catch (err) {
			setError(err.message || 'Failed to save score.');
			setHoleScores(previousHoleScores);
			setDraftScores((prev) => {
				const next = [...prev];
				next[holeIndex] =
					previousHoleScores[holeIndex] == null
						? ''
						: String(previousHoleScores[holeIndex]);
				return next;
			});
		} finally {
			setSavingHole(null);
		}
	};

	if (loading) {
		return (
			<section>
				<h1>Scorecard</h1>
				<p>Loading...</p>
			</section>
		);
	}

	if (error && !round && !player) {
		return (
			<section>
				<h1>Scorecard</h1>
				<p>Error: {error}</p>
			</section>
		);
	}

	if (!round || !player || !stats) {
		return (
			<section>
				<h1>Scorecard</h1>
				<p>Unable to load scorecard.</p>
			</section>
		);
	}

	return (
		<section>
			<header style={{ marginBottom: '1rem' }}>
				<h1>{player.name}</h1>
				<p>
					{round.name} — {round.courseName}
				</p>
				{round.date ? <p>Date: {round.date}</p> : null}
				{round.teeTime ? <p>Tee Time: {round.teeTime}</p> : null}
				<p>Declared Average: {player.declaredAverage}</p>
				<p>Thru: {stats.isFinished ? 'F' : stats.thru}</p>
				<p>
					Today:{' '}
					{formatRelativeScore(stats.currentRelative, {
						decimals: stats.isFinished ? 0 : 1,
					})}
				</p>
				<p>
					Projected:{' '}
					{formatRelativeScore(stats.projectedRelative, {
						decimals: stats.isFinished ? 0 : 1,
					})}
				</p>
				<p>Actual Total: {stats.actualTotal}</p>
				<p>Expected So Far: {stats.expectedSoFar.toFixed(1)}</p>
				<p>Projected Total: {stats.projectedTotal.toFixed(1)}</p>
				<p>
					<Link to={`/round/${round.id}`}>Back to Round</Link>
				</p>
			</header>

			{error ? <p>Error: {error}</p> : null}

			<table cellPadding='8'>
				<thead>
					<tr>
						<th>Hole</th>
						<th>Par</th>
						<th>Score</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{round.holePars.map((par, index) => {
						const score = holeScores[index];
						const isSaving = savingHole === index;

						return (
							<tr key={index}>
								<td>{index + 1}</td>
								<td>{par}</td>
								<td>
									<input
										type='number'
										inputMode='numeric'
										pattern='[0-9]*'
										min='1'
										max='15'
										step='1'
										value={draftScores[index]}
										onChange={(e) => handleDraftChange(index, e.target.value)}
										onBlur={() => saveHoleScore(index)}
										onFocus={(e) => {
											e.target.select();
											setTimeout(() => {
												e.target.scrollIntoView({
													behavior: 'smooth',
													block: 'center',
												});
											}, 300);
										}}
										style={{ width: '70px', fontSize: '16px' }}
									/>
								</td>
								<td>
									{isSaving
										? 'Saving...'
										: score === null
											? 'Not entered'
											: 'Saved'}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</section>
	);
}
