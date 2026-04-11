import { addDoc, arrayRemove, arrayUnion, collection, doc, runTransaction, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function updatePlayer(tripId, playerId, data) {
	return updateDoc(doc(db, 'trips', tripId, 'players', playerId), data);
}

export function addPlayer(tripId, data) {
	return addDoc(collection(db, 'trips', tripId, 'players'), data);
}

export async function claimPlayer(tripId, playerId, uid) {
	const playerRef = doc(db, 'trips', tripId, 'players', playerId);
	const tripRef = doc(db, 'trips', tripId);

	await runTransaction(db, async (tx) => {
		const snap = await tx.get(playerRef);
		if (!snap.exists()) throw new Error('Player not found.');
		if (snap.data().authUid) throw new Error('This player has already been claimed.');

		// Read isAdmin from the server — never trust the client for this
		const isAdmin = snap.data().isAdmin === true;

		tx.update(playerRef, { authUid: uid });

		const tripUpdate = { memberUids: arrayUnion(uid) };
		if (isAdmin) tripUpdate.adminUids = arrayUnion(uid);
		tx.update(tripRef, tripUpdate);
	});
}

// Used by AdminScreen when saving a player. If isAdmin changed on a claimed
// player, atomically syncs adminUids on the trip doc in the same batch.
export async function savePlayerAsAdmin(tripId, playerId, updates, existingPlayer) {
	const playerRef = doc(db, 'trips', tripId, 'players', playerId);
	const tripRef = doc(db, 'trips', tripId);

	const wasAdmin = existingPlayer.isAdmin === true;
	const isAdminNow = updates.isAdmin === true;
	const adminChanged = isAdminNow !== wasAdmin;
	const isClaimed = Boolean(existingPlayer.authUid);

	if (adminChanged && isClaimed) {
		const batch = writeBatch(db);
		batch.update(playerRef, updates);
		batch.update(tripRef, {
			adminUids: isAdminNow
				? arrayUnion(existingPlayer.authUid)
				: arrayRemove(existingPlayer.authUid),
		});
		await batch.commit();
	} else {
		await updateDoc(playerRef, updates);
	}
}
