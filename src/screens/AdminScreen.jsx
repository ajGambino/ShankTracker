import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateTrip } from '../services/trips';
import { addPlayer, savePlayerAsAdmin } from '../services/players';

const TRIP_ID = 'destin-2026';

export default function AdminScreen() {
	const [trip, setTrip] = useState(null);
	const [rounds, setRounds] = useState([]);
	const [players, setPlayers] = useState([]);
	const [playerDrafts, setPlayerDrafts] = useState({});
	const [newPlayer, setNewPlayer] = useState({
		name: '',
		declaredAverage: '',
		isAdmin: false,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [saving, setSaving] = useState(null);

	useEffect(() => {
		const loaded = { trip: false, rounds: false, players: false };

		const checkLoaded = () => {
			if (loaded.trip && loaded.rounds && loaded.players) {
				setLoading(false);
			}
		};

		const unsubTrip = onSnapshot(
			doc(db, 'trips', TRIP_ID),
			(snap) => {
				if (snap.exists()) {
					setTrip({ id: snap.id, ...snap.data() });
				}
				loaded.trip = true;
				checkLoaded();
			},
			(err) => setError(err.message),
		);

		const unsubRounds = onSnapshot(
			collection(db, 'trips', TRIP_ID, 'rounds'),
			(snap) => {
				const data = snap.docs
					.map((d) => ({ id: d.id, ...d.data() }))
					.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
				setRounds(data);
				loaded.rounds = true;
				checkLoaded();
			},
			(err) => setError(err.message),
		);

		const unsubPlayers = onSnapshot(
			collection(db, 'trips', TRIP_ID, 'players'),
			(snap) => {
				const incoming = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
				setPlayers(incoming);
				setPlayerDrafts((prev) => {
					const next = { ...prev };
					for (const p of incoming) {
						if (!next[p.id]) {
							next[p.id] = {
								name: p.name ?? '',
								declaredAverage: String(p.declaredAverage ?? ''),
								isAdmin: p.isAdmin ?? false,
							};
						}
					}
					for (const id of Object.keys(next)) {
						if (!incoming.find((p) => p.id === id)) {
							delete next[id];
						}
					}
					return next;
				});
				loaded.players = true;
				checkLoaded();
			},
			(err) => setError(err.message),
		);

		return () => {
			unsubTrip();
			unsubRounds();
			unsubPlayers();
		};
	}, []);

	const handleRoundChange = async (e) => {
		setError(null);
		try {
			await updateTrip(TRIP_ID, { currentRoundId: e.target.value });
		} catch (err) {
			setError(err.message);
		}
	};

	const handleLockToggle = async () => {
		setError(null);
		try {
			await updateTrip(TRIP_ID, { averagesLocked: !(trip.averagesLocked ?? false) });
		} catch (err) {
			setError(err.message);
		}
	};

	const handlePlayerDraftChange = (playerId, field, value) => {
		setPlayerDrafts((prev) => ({
			...prev,
			[playerId]: { ...prev[playerId], [field]: value },
		}));
	};

	const handleSavePlayer = async (playerId) => {
		const draft = playerDrafts[playerId];
		if (!draft) return;

		const avg = Number.parseFloat(draft.declaredAverage);
		if (!draft.name.trim()) {
			setError('Player name cannot be empty.');
			return;
		}
		if (Number.isNaN(avg)) {
			setError('Declared average must be a valid number.');
			return;
		}

		const player = players.find((p) => p.id === playerId);
		if (!player) return;

		setError(null);
		setSaving(playerId);
		try {
			await savePlayerAsAdmin(
				TRIP_ID,
				playerId,
				{ name: draft.name.trim(), declaredAverage: avg, isAdmin: draft.isAdmin },
				player,
			);
		} catch (err) {
			setError(err.message);
		} finally {
			setSaving(null);
		}
	};

	const handleAddPlayer = async () => {
		const avg = Number.parseFloat(newPlayer.declaredAverage);
		if (!newPlayer.name.trim()) {
			setError('Player name cannot be empty.');
			return;
		}
		if (Number.isNaN(avg)) {
			setError('Declared average must be a valid number.');
			return;
		}

		setError(null);
		setSaving('new');
		try {
			await addPlayer(TRIP_ID, {
				name: newPlayer.name.trim(),
				declaredAverage: avg,
				isAdmin: newPlayer.isAdmin,
			});
			setNewPlayer({ name: '', declaredAverage: '', isAdmin: false });
		} catch (err) {
			setError(err.message);
		} finally {
			setSaving(null);
		}
	};

	if (loading) {
		return (
			<section>
				<h1>Admin</h1>
				<p className='text-muted'>Loading...</p>
			</section>
		);
	}

	return (
		<section>
			<h1>Admin</h1>

			{error ? <p className='error-msg'>{error}</p> : null}

			<section style={{ marginBottom: '2rem' }}>
				<h2>Trip Controls</h2>
				{trip ? (
					<>
						<div style={{ marginBottom: '1rem' }}>
							<label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 500 }}>
								Current Round{' '}
								<span className='text-muted text-sm'>— controls which round is shown across the app</span>
							</label>
							<select value={trip.currentRoundId ?? ''} onChange={handleRoundChange}>
								<option value=''>— none —</option>
								{rounds.map((r) => (
									<option key={r.id} value={r.id}>
										{r.name} — {r.courseName}
									</option>
								))}
							</select>
						</div>

						{rounds.length > 0 && (
							<div style={{ marginBottom: '1rem', overflowX: 'auto' }}>
								<table className='data-table'>
									<thead>
										<tr>
											<th>Round</th>
											<th>Course</th>
											<th>Par</th>
										</tr>
									</thead>
									<tbody>
										{rounds.map((r) => (
											<tr key={r.id}>
												<td>{r.name}</td>
												<td>{r.courseName}</td>
												<td>{r.totalPar ?? '—'}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						<label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
							<input
								type='checkbox'
								checked={trip.averagesLocked ?? false}
								onChange={handleLockToggle}
							/>
							<span>
								Lock Averages
								{trip.averagesLocked && (
									<span className='text-muted text-sm'>
										{' '}— players can no longer change declared averages
									</span>
								)}
							</span>
						</label>
					</>
				) : (
					<p className='text-muted'>Trip not found.</p>
				)}
			</section>

			<section>
				<h2>Players</h2>
				<div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
					<table className='data-table'>
						<thead>
							<tr>
								<th>Name</th>
								<th>Avg</th>
								<th>Admin</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{players.map((p) => {
								const draft = playerDrafts[p.id] ?? {};
								return (
									<tr key={p.id}>
										<td>
											<input
												value={draft.name ?? ''}
												onChange={(e) =>
													handlePlayerDraftChange(p.id, 'name', e.target.value)
												}
												style={{ width: '140px' }}
											/>
										</td>
										<td>
											<input
												type='number'
												value={draft.declaredAverage ?? ''}
												onChange={(e) =>
													handlePlayerDraftChange(
														p.id,
														'declaredAverage',
														e.target.value,
													)
												}
												disabled={trip?.averagesLocked ?? false}
												style={{ width: '70px' }}
											/>
										</td>
										<td style={{ textAlign: 'center' }}>
											<input
												type='checkbox'
												checked={draft.isAdmin ?? false}
												onChange={(e) =>
													handlePlayerDraftChange(p.id, 'isAdmin', e.target.checked)
												}
											/>
										</td>
										<td>
											<button
												onClick={() => handleSavePlayer(p.id)}
												disabled={saving === p.id}
											>
												{saving === p.id ? 'Saving…' : 'Save'}
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				<h3>Add Player</h3>
				<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
					<input
						placeholder='Name'
						value={newPlayer.name}
						onChange={(e) => setNewPlayer((prev) => ({ ...prev, name: e.target.value }))}
						style={{ flex: '1 1 140px' }}
					/>
					<input
						type='number'
						placeholder='Declared Avg'
						value={newPlayer.declaredAverage}
						onChange={(e) =>
							setNewPlayer((prev) => ({ ...prev, declaredAverage: e.target.value }))
						}
						style={{ width: '120px' }}
					/>
					<label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
						<input
							type='checkbox'
							checked={newPlayer.isAdmin}
							onChange={(e) =>
								setNewPlayer((prev) => ({ ...prev, isAdmin: e.target.checked }))
							}
						/>
						Admin
					</label>
					<button
						className='btn-primary'
						onClick={handleAddPlayer}
						disabled={saving === 'new'}
					>
						{saving === 'new' ? 'Adding…' : 'Add Player'}
					</button>
				</div>
			</section>
		</section>
	);
}
