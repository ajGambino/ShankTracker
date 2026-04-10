import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function updateRound(tripId, roundId, data) {
	return updateDoc(doc(db, 'trips', tripId, 'rounds', roundId), data);
}
