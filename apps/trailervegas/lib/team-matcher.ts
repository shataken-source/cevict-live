/**
 * Simple team name matching — normalizes and fuzzy-compares team names.
 */

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function teamsMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  return false
}

export function gameTeamsMatch(
  homeA: string, awayA: string,
  homeB: string, awayB: string
): boolean {
  return teamsMatch(homeA, homeB) && teamsMatch(awayA, awayB)
}
