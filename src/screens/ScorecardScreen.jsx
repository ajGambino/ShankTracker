import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import {
	sumHoleScores,
	sumCompletedHolePars,
	countCompletedHoles,
	getExpectedSoFar,
	getProjectedRoundTotal,
	getCurrentRelativeScore,
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
	const { currentPlayer, isAdmin } = useAuth();
	const canEdit = currentPlayer?.id === playerId || isAdmin;

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

		const holePars =
			round.holePars?.length === 18 ? round.holePars : Array(18).fill(4);
		const totalPar = round.totalPar ?? holePars.reduce((a, b) => a + b, 0);

		const actualTotal = sumHoleScores(holeScores);
		const thru = countCompletedHoles(holeScores);
		const expectedSoFar = getExpectedSoFar(
			player.declaredAverage,
			totalPar,
			holePars,
			holeScores,
		);
		const projectedTotal = getProjectedRoundTotal(
			player.declaredAverage,
			totalPar,
			holePars,
			holeScores,
		);

		const isFinished = thru === 18;

		const completedPar = sumCompletedHolePars(holePars, holeScores);
		const todayVsPar = actualTotal - completedPar;

		const pace = isFinished
			? actualTotal - player.declaredAverage
			: getCurrentRelativeScore(
					player.declaredAverage,
					totalPar,
					holePars,
					holeScores,
				);

		return {
			actualTotal,
			thru,
			expectedSoFar,
			projectedTotal,
			todayVsPar,
			pace,
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
		if (!round || !player || !canEdit) return;

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
				<p className='text-muted'>Loading...</p>
			</section>
		);
	}

	if (error && !round && !player) {
		return (
			<section>
				<h1>Scorecard</h1>
				<p className='error-msg'>{error}</p>
			</section>
		);
	}

	if (!round || !player || !stats) {
		return (
			<section>
				<h1>Scorecard</h1>
				<p className='text-muted'>Unable to load scorecard.</p>
			</section>
		);
	}

	return (
		<section>
			<header style={{ marginBottom: '1.25rem' }}>
				<h1>{player.name}</h1>
				<p className='screen-meta'>
					{round.name} — {round.courseName}
				</p>
				{(round.date || round.teeTime) && (
					<p className='screen-meta'>
						{[round.date, round.teeTime && `Tee ${round.teeTime}`]
							.filter(Boolean)
							.join(' · ')}
					</p>
				)}

				<div className='stat-row'>
					<span className='stat-item'>
						<strong>Thru</strong>{stats.isFinished ? 'F' : stats.thru}
					</span>
					<span className='stat-item'>
						<strong>Today</strong>
						{formatRelativeScore(stats.todayVsPar, { decimals: 0 })}
					</span>
					<span className='stat-item'>
						<strong>Pace</strong>
						{formatRelativeScore(stats.pace, {
							decimals: stats.thru > 0 && !stats.isFinished ? 1 : 0,
						})}
					</span>
					<span className='stat-item'>
						<strong>Total</strong>{stats.actualTotal}
					</span>
					<span className='stat-item'>
						<strong>Exp</strong>{stats.expectedSoFar.toFixed(1)}
					</span>
					<span className='stat-item'>
						<strong>Proj</strong>{stats.projectedTotal.toFixed(1)}
					</span>
					<span className='stat-item'>
						<strong>Avg</strong>{player.declaredAverage}
					</span>
				</div>

				<Link to={`/round/${round.id}`} className='text-sm'>
					← Back to Round
				</Link>
			</header>

			{error ? <p className='error-msg'>{error}</p> : null}

			<table className='data-table'>
				<thead>
					<tr>
						<th>Hole</th>
						<th>Par</th>
						<th>Score</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{(round.holePars?.length === 18 ? round.holePars : Array(18).fill(4)).map((par, index) => {
						const score = holeScores[index];
						const isSaving = savingHole === index;

						return (
							<tr key={index}>
								<td className='text-muted'>{index + 1}</td>
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
										disabled={!canEdit}
										onFocus={(e) => {
											e.target.select();
											setTimeout(() => {
												e.target.scrollIntoView({
													behavior: 'smooth',
													block: 'center',
												});
											}, 300);
										}}
										style={{ width: '70px' }}
									/>
								</td>
								<td className='text-muted text-sm'>
									{isSaving
										? 'Saving...'
										: score === null
											? '—'
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
