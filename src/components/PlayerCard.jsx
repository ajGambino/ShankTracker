import { Link } from 'react-router-dom';

const scoreClass = (raw) =>
	raw < 0 ? 'score-under' : raw > 0 ? 'score-over' : 'score-even';

const thruLabel = (row) => (row.isFinished ? 'F' : `Thru ${row.thru}`);

export function RoundPlayerCard({ row, roundId }) {
	return (
		<Link to={`/scorecard/${roundId}/${row.playerId}`} className='player-card'>
			<div className='player-card-top'>
				<div className='player-card-identity'>
					<span className='text-muted text-sm'>{row.rank}</span>
					<span className='player-card-name'>{row.name}</span>
				</div>
				<span className={`player-card-primary ${scoreClass(row.todayRaw)}`}>
					{row.todayDisplay}
				</span>
			</div>
			<div className='player-card-sub'>
				<span> {thruLabel(row)}</span>
				<span>
					Pace{' '}
					<span className={scoreClass(row.projectedRaw)}>
						{row.projectedDisplay}
					</span>
				</span>
			</div>
			<div className='player-card-scorecard-hint'>Scorecard →</div>
		</Link>
	);
}

export function MainPlayerCard({ row }) {
	return (
		<div className='player-card'>
			<div className='player-card-top'>
				<div className='player-card-identity'>
					<span className='text-muted text-sm'>{row.rank}</span>
					<span className='player-card-name'>{row.name}</span>
				</div>
				<span className={`player-card-primary ${scoreClass(row.totalRaw)}`}>
					{row.totalDisplay}
				</span>
			</div>
			<div className='player-card-sub'>
				<span>Thru: {thruLabel(row)}</span>
				<span>
					Today{' '}
					<span className={scoreClass(row.projectedRaw)}>
						{row.projectedDisplay}
					</span>
				</span>
			</div>
		</div>
	);
}
