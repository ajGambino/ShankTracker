import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth } from '../lib/auth';
import { db } from '../lib/firebase';

const AuthContext = createContext(null);

const TRIP_ID_KEY = 'shanktracker_tripId';

export function AuthProvider({ children }) {
	const [user, setUser] = useState(undefined); // undefined = still initializing
	const [currentPlayer, setCurrentPlayer] = useState(null);
	const [tripId, setTripIdState] = useState(
		() => localStorage.getItem(TRIP_ID_KEY),
	);

	const setTripId = (id) => {
		if (id) {
			localStorage.setItem(TRIP_ID_KEY, id);
		} else {
			localStorage.removeItem(TRIP_ID_KEY);
		}
		setTripIdState(id);
	};

	useEffect(() => {
		return onAuthStateChanged(auth, (firebaseUser) => {
			setUser(firebaseUser ?? null);
		});
	}, []);

	useEffect(() => {
		if (!user || !tripId) {
			setCurrentPlayer(null);
			return;
		}
		return onSnapshot(collection(db, 'trips', tripId, 'players'), (snap) => {
			const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
			setCurrentPlayer(players.find((p) => p.authUid === user.uid) ?? null);
		});
	}, [user, tripId]);

	const isAdmin = currentPlayer?.isAdmin === true;
	const loading = user === undefined;

	return (
		<AuthContext.Provider
			value={{ user, loading, currentPlayer, isAdmin, tripId, setTripId }}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	return useContext(AuthContext);
}
