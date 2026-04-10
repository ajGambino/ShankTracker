import { Link } from 'react-router-dom'
import { PATHS } from '../routes/paths.js'

export default function NotFoundScreen() {
  return (
    <section>
      <h1>404 — Page Not Found</h1>
      <p>
        This page does not exist. <Link to={PATHS.LEADERBOARD}>Go to Leaderboard</Link>.
      </p>
    </section>
  )
}
