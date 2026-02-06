// lib/keys-store.ts
export function getPrimaryKey(): string {
  return process.env.API_SPORTS_KEY || '';
}

export function getSportsBlazeKey(): string {
  return process.env.SPORTS_BLAZE_API_KEY || '';
}

export function getTheOddsApiKey(): string {
  return process.env.THE_ODDS_API_KEY || '';
}