/**
 * NBA win probability from Elo-style strength ratings.
 * P(team A wins) = 1 / (1 + 10^((ratingB - ratingA) / 400))
 */

export function winProbability(ratingHome: number, ratingAway: number): number {
  const diff = (ratingAway - ratingHome) / 400;
  return 1 / (1 + Math.pow(10, diff));
}

export function eloUpdate(
  rating: number,
  opponentRating: number,
  won: boolean,
  k = 20
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
  const actual = won ? 1 : 0;
  return rating + k * (actual - expected);
}
