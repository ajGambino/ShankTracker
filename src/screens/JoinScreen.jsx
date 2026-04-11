import { useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { signInWithGoogle, signOut } from '../lib/auth';
import { claimPlayer } from '../services/players';
import { useAuth } from '../context/AuthContext';

export default function JoinScreen() {
	const { user, tripId, setTripId } = useAuth();

	const [step, setStep] = useState(() => {
		// Sign-in must come first — trip reads require authentication
		if (!user) return 'sign-in';
		if (!tripId) return 'enter-trip';
		return 'claim-player';
	});

	const [tripCodeInput, setTripCodeInput] = useState(tripId ?? '');
	const [unclaimedPlayers, setUnclaimedPlayers] = useState([]);
	const [loadingAction, setLoadingAction] = useState(false);
	const [claiming, setClaiming] = useState(null);
	const [error, setError] = useState(null);

	// Advance from sign-in once auth resolves; go to enter-trip if no trip stored yet
	useEffect(() => {
		if (step === 'sign-in' && user) {
			setStep(tripId ? 'claim-player' : 'enter-trip');
		}
	}, [step, user, tripId]);

	// Subscribe to unclaimed players when on claim step
	useEffect(() => {
		if (step !== 'claim-player' || !tripId) return;
		return onSnapshot(collection(db, 'trips', tripId, 'players'), (snap) => {
			const players = snap.docs
				.map((d) => ({ id: d.id, ...d.data() }))
				.filter((p) => !p.authUid)
				.sort((a, b) => a.name.localeCompare(b.name));
			setUnclaimedPlayers(players);
		});
	}, [step, tripId]);

	const handleTripContinue = async () => {
		const code = tripCodeInput.trim();
		if (!code) {
			setError('Please enter a trip code.');
			return;
		}
		setError(null);
		setLoadingAction(true);
		try {
			const tripSnap = await getDoc(doc(db, 'trips', code));
			if (!tripSnap.exists()) {
				setError('Trip not found. Check your code and try again.');
				return;
			}
			setTripId(code);
			setStep('claim-player'); // user is always signed-in by the time this runs
		} catch (err) {
			setError(err.message);
		} finally {
			setLoadingAction(false);
		}
	};

	const handleSignIn = async () => {
		setError(null);
		setLoadingAction(true);
		try {
			await signInWithGoogle();
			// onAuthStateChanged in AuthContext updates user
			// useEffect above will advance step to claim-player
		} catch (err) {
			if (err.code !== 'auth/popup-closed-by-user') {
				setError(err.message);
			}
		} finally {
			setLoadingAction(false);
		}
	};

	const handleClaim = async (playerId) => {
		if (!user || !tripId) return;
		setError(null);
		setClaiming(playerId);
		try {
			await claimPlayer(tripId, playerId, user.uid);
			// AuthContext detects authUid match → sets currentPlayer → AppRoutes redirects
		} catch (err) {
			setError(err.message);
			setClaiming(null);
		}
	};

	const handleSignOut = async () => {
		await signOut();
		setTripId(null);
		setStep('sign-in'); // sign-in is now the first step
	};

	return (
		<section className='join-screen'>
			<h1>ShankTracker</h1>

			{error ? <p className='error-msg'>{error}</p> : null}

			{step === 'sign-in' && (
				<>
					<h2>Sign In</h2>
					<button
						className='btn-primary'
						onClick={handleSignIn}
						disabled={loadingAction}
						style={{ width: '100%' }}
					>
						{loadingAction ? 'Signing in…' : 'Sign in with Google'}
					</button>
				</>
			)}

			{step === 'enter-trip' && (
				<>
					<h2>Enter Trip Code</h2>
					<div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
						<input
							value={tripCodeInput}
							onChange={(e) => setTripCodeInput(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleTripContinue()}
							placeholder='e.g. destin-2026'
							style={{ flex: 1 }}
						/>
						<button
							className='btn-primary'
							onClick={handleTripContinue}
							disabled={loadingAction}
						>
							{loadingAction ? 'Checking…' : 'Continue'}
						</button>
					</div>
				</>
			)}

			{step === 'claim-player' && (
				<>
					<h2>Who are you?</h2>
					<p className='text-muted text-sm'>Select your name to join the trip.</p>
					{unclaimedPlayers.length === 0 ? (
						<p>All players already claimed. Contact your trip admin.</p>
					) : (
						<ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem' }}>
							{unclaimedPlayers.map((p) => (
								<li key={p.id} style={{ marginBottom: '0.5rem' }}>
									<button
										onClick={() => handleClaim(p.id)}
										disabled={claiming !== null}
										style={{
											fontSize: '16px',
											width: '100%',
											textAlign: 'left',
											padding: '0.6rem 0.75rem',
										}}
									>
										{claiming === p.id ? 'Claiming…' : p.name}
										<small style={{ marginLeft: '0.75rem', color: 'var(--color-text-muted)' }}>
											Avg: {p.declaredAverage}
										</small>
									</button>
								</li>
							))}
						</ul>
					)}
					<button className='btn-ghost' onClick={handleSignOut}>
						Sign out
					</button>
				</>
			)}
		</section>
	);
}
