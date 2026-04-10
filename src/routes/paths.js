export const PATHS = {
  LEADERBOARD: '/',
  ROUND: '/round/:roundId',
  SCORECARD: '/scorecard/:roundId/:playerId',
  PLAYERS: '/players',
  ADMIN: '/admin',
};

// Usage: buildPath(PATHS.ROUND, { roundId: 'round-1' }) → '/round/round-1'
export function buildPath(pattern, params = {}) {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, value),
    pattern
  );
}
