import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function updateTrip(tripId, data) {
	return updateDoc(doc(db, 'trips', tripId), data);
}
