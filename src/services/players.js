import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function updatePlayer(tripId, playerId, data) {
	return updateDoc(doc(db, 'trips', tripId, 'players', playerId), data);
}

export function addPlayer(tripId, data) {
	return addDoc(collection(db, 'trips', tripId, 'players'), data);
}
