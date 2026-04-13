/**
 * One-off backfill script — Firebase Admin SDK
 *
 * What it does:
 *   1. Reads all player docs and backfills memberUids / adminUids on the trip doc
 *   2. Seeds each round doc with date, teeTime, totalPar, holePars, holeYardages from the course JSONs
 *
 * Setup:
 *   npm install --save-dev firebase-admin
 *   Download service account key from Firebase Console → Project Settings → Service Accounts
 *   Save it as scripts/serviceAccountKey.json
 *
 * Run:
 *   node scripts/backfillTripData.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── CONFIG — edit these before running ──────────────────────────────────────

const TRIP_ID = 'destin-2026'; // ← your Firestore trip document ID

const TEE_SELECTION = {
	gender: 'male', // 'male' | 'female'
	index: 0, // 0 = first tee in that gender array
};

const ROUND_SCHEDULE = [
	{ order: 1, courseKey: 'emeraldBay', date: '2026-05-13', teeTime: '08:32' },
	{
		order: 2,
		courseKey: 'kellyPlantation',
		date: '2026-05-14',
		teeTime: '09:06',
	},
	{ order: 3, courseKey: 'regatta', date: '2026-05-15', teeTime: '09:36' },
];

// ─── COURSE JSON PATHS ────────────────────────────────────────────────────────

const COURSE_JSON_PATHS = {
	emeraldBay: path.join(__dirname, '../notes/emerald_bay.json'),
	kellyPlantation: path.join(__dirname, '../notes/kelly_plantation.json'),
	regatta: path.join(__dirname, '../notes/regatta.json'),
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function loadCourseJson(filePath) {
	const raw = JSON.parse(readFileSync(filePath, 'utf8'));
	// Regatta is wrapped in a { courses: [...] } envelope; others are bare
	return raw.courses ? raw.courses[0] : raw;
}

function getTeeData(courseJson, gender, index) {
	const tees = courseJson.tees[gender];
	if (!tees || tees.length === 0) throw new Error(`No ${gender} tees found`);
	if (index >= tees.length)
		throw new Error(
			`Tee index ${index} out of range (${tees.length} tees available)`,
		);
	return tees[index];
}

// ─── FIREBASE ADMIN INIT ──────────────────────────────────────────────────────

const serviceAccount = JSON.parse(
	readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'),
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
	console.log(`\n=== ShankTracker backfill — trip: ${TRIP_ID} ===\n`);

	// ── Step 1: Build course map ────────────────────────────────────────────────
	const courseMap = {};
	for (const entry of ROUND_SCHEDULE) {
		const jsonPath = COURSE_JSON_PATHS[entry.courseKey];
		if (!jsonPath)
			throw new Error(
				`No JSON path configured for courseKey: ${entry.courseKey}`,
			);

		const courseJson = loadCourseJson(jsonPath);
		const tee = getTeeData(
			courseJson,
			TEE_SELECTION.gender,
			TEE_SELECTION.index,
		);
		const holePars = tee.holes.map((h) => h.par);
		const holeYardages = tee.holes.map((h) => h.yardage);
		const holeParsSum = holePars.reduce((a, b) => a + b, 0);

		if (holeParsSum !== tee.par_total) {
			throw new Error(
				`Course "${entry.courseKey}" tee "${tee.tee_name}": sum(holePars)=${holeParsSum} !== par_total=${tee.par_total}`,
			);
		}

		if (holeYardages.length !== holePars.length) {
			throw new Error(
				`Course "${entry.courseKey}" tee "${tee.tee_name}": holeYardages.length=${holeYardages.length} !== holePars.length=${holePars.length}`,
			);
		}

		courseMap[entry.courseKey] = {
			teeName: tee.tee_name,
			totalPar: tee.par_total,
			holePars,
			holeYardages,
		};

		console.log(
			`Loaded course "${entry.courseKey}" → tee "${tee.tee_name}" (par ${tee.par_total}, ${holePars.length} holes)`,
		);
	}

	// ── Step 2: Backfill memberUids / adminUids on trip doc ────────────────────
	console.log('\n--- Players ---');
	const playersSnap = await db
		.collection('trips')
		.doc(TRIP_ID)
		.collection('players')
		.get();

	const memberUids = [];
	const adminUids = [];

	for (const docSnap of playersSnap.docs) {
		const p = docSnap.data();
		if (p.authUid) {
			memberUids.push(p.authUid);
			if (p.isAdmin === true) {
				adminUids.push(p.authUid);
				console.log(`  ${p.name}: member + admin (uid: ${p.authUid})`);
			} else {
				console.log(`  ${p.name}: member (uid: ${p.authUid})`);
			}
		} else {
			console.log(`  ${p.name}: no authUid — skipped`);
		}
	}

	await db.collection('trips').doc(TRIP_ID).update({ memberUids, adminUids });
	console.log(
		`\nTrip doc updated: memberUids[${memberUids.length}], adminUids[${adminUids.length}]`,
	);

	// ── Step 3: Seed round docs ────────────────────────────────────────────────
	console.log('\n--- Rounds ---');
	const roundsSnap = await db
		.collection('trips')
		.doc(TRIP_ID)
		.collection('rounds')
		.get();

	// Build a lookup: order → { docId, data }
	const roundsByOrder = {};
	for (const docSnap of roundsSnap.docs) {
		const data = docSnap.data();
		if (data.order != null)
			roundsByOrder[data.order] = { id: docSnap.id, data };
	}

	for (const entry of ROUND_SCHEDULE) {
		const round = roundsByOrder[entry.order];
		if (!round) {
			console.log(
				`  Round order=${entry.order}: NOT FOUND in Firestore — skipping`,
			);
			continue;
		}

		const course = courseMap[entry.courseKey];
		const update = {
			date: entry.date,
			teeTime: entry.teeTime,
			totalPar: course.totalPar,
			holePars: course.holePars,
			holeYardages: course.holeYardages,
		};

		await db
			.collection('trips')
			.doc(TRIP_ID)
			.collection('rounds')
			.doc(round.id)
			.update(update);

		console.log(
			`  Round ${entry.order} (${round.id}): date=${entry.date}, teeTime=${entry.teeTime}, ` +
				`totalPar=${course.totalPar}, tee="${course.teeName}"`,
		);
	}

	console.log('\n=== Done ===\n');
	process.exit(0);
}

main().catch((err) => {
	console.error('\nBackfill failed:', err.message);
	process.exit(1);
});
