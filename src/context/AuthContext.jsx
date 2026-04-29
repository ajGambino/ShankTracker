import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

const DEFAULT_TRIP_ID = 'destin-2026';

export function AuthProvider({ children }) {
	return (
		<AuthContext.Provider
			value={{
				user: null,
				loading: false,
				currentPlayer: null,
				isAdmin: false,
				tripId: DEFAULT_TRIP_ID,
				setTripId: () => {},
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	return useContext(AuthContext);
}
