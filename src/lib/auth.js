import {
	getAuth,
	GoogleAuthProvider,
	signInWithPopup,
	signOut as firebaseSignOut,
} from 'firebase/auth';
import { app } from './firebase';

export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
	return signInWithPopup(auth, googleProvider);
}

export function signOut() {
	return firebaseSignOut(auth);
}
