/**
 * src/utils/leaderboard.js
 * Pure calculation and formatting logic for leaderboard scoring.
 * No Firestore code lives here.
 */

// ---------------------------------------------------------------------------
// Hole-level helpers
// ---------------------------------------------------------------------------

export function sumHoleScores(holeScores) {
	return holeScores.reduce(
		(sum, s) => (typeof s === 'number' ? sum + s : sum),
		0,
	);
}

export function countCompletedHoles(holeScores) {
	return holeScores.filter((s) => typeof s === 'number').length;
}

export function sumCompletedHolePars(holePars, holeScores) {
	return holePars.reduce(
		(sum, par, i) => (typeof holeScores[i] === 'number' ? sum + par : sum),
		0,
	);
}

export function sumRemainingHolePars(holePars, holeScores) {
	return holePars.reduce(
		(sum, par, i) => (typeof holeScores[i] === 'number' ? sum : sum + par),
		0,
	);
}

// ---------------------------------------------------------------------------
// Scoring rate and projections
// ---------------------------------------------------------------------------

// How many strokes per par this player is expected to take.
// e.g. 95 avg / 72 par = 1.319 strokes per par point
export function getScoringRate(declaredAverage, totalPar) {
	return declaredAverage / totalPar;
}

// Expected strokes for holes already played, based on their par values.
// e.g. played holes worth 36 par, at rate 1.319 → expected 47.5 strokes
export function getExpectedSoFar(
	declaredAverage,
	totalPar,
	holePars,
	holeScores,
) {
	const rate = getScoringRate(declaredAverage, totalPar);
	return sumCompletedHolePars(holePars, holeScores) * rate;
}

// Actual strokes taken so far + projected strokes on remaining holes.
export function getProjectedRoundTotal(
	declaredAverage,
	totalPar,
	holePars,
	holeScores,
) {
	const rate = getScoringRate(declaredAverage, totalPar);
	const actualSoFar = sumHoleScores(holeScores);
	const remainingPar = sumRemainingHolePars(holePars, holeScores);
	return actualSoFar + remainingPar * rate;
}

// Actual strokes so far vs what was expected for those same holes.
// Negative = playing better than pace, positive = worse.
export function getCurrentRelativeScore(
	declaredAverage,
	totalPar,
	holePars,
	holeScores,
) {
	return (
		sumHoleScores(holeScores) -
		getExpectedSoFar(declaredAverage, totalPar, holePars, holeScores)
	);
}

// Projected final total vs declared average.
export function getProjectedRelativeScore(
	declaredAverage,
	totalPar,
	holePars,
	holeScores,
) {
	return (
		getProjectedRoundTotal(declaredAverage, totalPar, holePars, holeScores) -
		declaredAverage
	);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

// Formats a numeric relative score golf-style.
// 0 → 'E', positive → '+2', negative → '-3'
// Pass { decimals: 1 } for projected scores that may be fractional mid-round.
export function formatRelativeScore(value, options = {}) {
	const { decimals = 0 } = options;
	const fixed = value.toFixed(decimals);
	const num = parseFloat(fixed);
	if (num === 0) return 'E';
	if (num > 0) return `+${fixed}`;
	return fixed;
}

// ---------------------------------------------------------------------------
// Leaderboard row builder
// ---------------------------------------------------------------------------

/**
 * Builds sorted leaderboard rows from raw Firestore data.
 *
 * @param {object} params
 * @param {Array}  params.players        - player docs from Firestore
 * @param {Array}  params.rounds         - round docs from Firestore
 * @param {Array}  params.scorecards     - scorecard docs from Firestore
 * @param {string} params.currentRoundId - trip.currentRoundId
 * @returns {Array} sorted rows, ascending by totalRaw (lower is better)
 */
export function buildLeaderboardRows({
	players,
	rounds,
	scorecards,
	currentRoundId,
}) {
	const currentRound = rounds.find((r) => r.id === currentRoundId) ?? null;

	// Scorecard lookup: `${roundId}_${playerId}` → scorecard
	const scorecardMap = Object.fromEntries(
		scorecards.map((sc) => [`${sc.roundId}_${sc.playerId}`, sc]),
	);

	// Rounds fully before the current one — their final scores count toward total
	const completedRounds = currentRound
		? rounds.filter((r) => r.order < currentRound.order)
		: [];

	const rows = players.map((player) => {
		const { id: playerId, name, declaredAverage } = player;

		// --- Current round ---
		const currentSc = currentRound
			? scorecardMap[`${currentRoundId}_${playerId}`]
			: null;

		let thru = 0;
		let isFinished = false;
		let todayVsParRaw = 0;
		let todayVsAvgRaw = 0;

		if (currentSc && currentRound) {
			thru = countCompletedHoles(currentSc.holeScores);
			isFinished = thru === 18;

			const actualSoFar = sumHoleScores(currentSc.holeScores);
			const completedPar = sumCompletedHolePars(
				currentRound.holePars,
				currentSc.holeScores,
			);

			// Real golf score vs par
			todayVsParRaw = actualSoFar - completedPar;

			// Score vs declared average (handicap-adjusted)
			if (isFinished) {
				todayVsAvgRaw = currentSc.actualTotal - declaredAverage;
			} else if (thru > 0) {
				todayVsAvgRaw = getCurrentRelativeScore(
					declaredAverage,
					currentRound.totalPar,
					currentRound.holePars,
					currentSc.holeScores,
				);
			}
			// thru === 0 with a doc but no scores entered: stays 0 / 0
		}

		// --- Prior completed rounds ---
		let priorTotal = 0;
		for (const round of completedRounds) {
			const sc = scorecardMap[`${round.id}_${playerId}`];
			if (sc && sc.holesCompleted === 18) {
				priorTotal += sc.actualTotal - declaredAverage;
			}
		}

		const totalRaw = priorTotal + todayVsAvgRaw;

		const liveRound = !isFinished && thru > 0;

		return {
			playerId,
			name,
			declaredAverage,
			thru,
			isFinished,
			todayRaw: todayVsParRaw,
			todayDisplay: formatRelativeScore(todayVsParRaw, {
				decimals: 0,
			}),
			projectedRaw: todayVsAvgRaw,
			projectedDisplay: formatRelativeScore(todayVsAvgRaw, {
				decimals: liveRound ? 1 : 0,
			}),
			totalRaw,
			totalDisplay: formatRelativeScore(totalRaw, {
				decimals: liveRound ? 1 : 0,
			}),
		};
	});

	// Lower totalRaw = better (golf scoring)
	rows.sort((a, b) => a.totalRaw - b.totalRaw);

	return rows;
}
