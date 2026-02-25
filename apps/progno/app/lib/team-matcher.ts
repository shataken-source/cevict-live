/**
 * Shared team name matching utilities.
 * Used by daily-results grading and Kalshi market matching.
 * Originally from alpha-hunter/EliteTeamMatcher.ts, copied into submit-picks/route.ts.
 */

const MASCOT_WORDS = [
  'wildcats', 'bulldogs', 'tigers', 'eagles', 'red storm', 'huskies', 'knights',
  'longhorns', 'bruins', 'gators', 'cowboys', 'privateers', 'lumberjacks',
  'highlanders', 'waves', 'mustangs', 'cougars', 'vaqueros', 'delta devils',
  'rockets', 'jazz', 'lakers', 'magic', 'grizzlies', 'kings', 'trojans',
  'wolverines', 'gophers', 'zips', 'bulls', 'hawks', 'wizards', 'pacers',
  '76ers', 'sixers', 'dukes', 'hokies', 'colonels', 'cardinals', 'lions',
  'bears', 'panthers', 'falcons', 'ravens', 'steelers', 'patriots', 'chiefs',
  'golden gophers', 'purple aces', 'red hawks', 'blue raiders', 'mean green',
  'golden eagles', 'golden flashes', 'golden hurricanes', 'fighting illini',
  'tar heels', 'blue devils', 'orange', 'scarlet knights', 'horned frogs',
  'wolf pack', 'wolfpack', 'yellow jackets', 'golden bears', 'rainbow warriors',
]

export function normalizeForMatch(raw: string): string {
  let name = raw.toLowerCase()
  name = name.replace(/[-]/g, ' ')      // hyphen → space (Arkansas-Little Rock → arkansas little rock)
  name = name.replace(/[.,'()]/g, '')
  // Expand common abbreviations before mascot stripping
  name = name.replace(/\bmiss\b/g, 'mississippi')
  name = name.replace(/\bmt\b/g, 'mount')
  name = name.replace(/\bft\b/g, 'fort')
  name = name.replace(/\bapp\b/g, 'appalachian')
  name = name.replace(/\bst\b|\bst\.\b/g, 'state')
  MASCOT_WORDS.forEach(word => {
    name = name.replace(new RegExp(`\\b${word}\\b`, 'g'), '')
  })
  name = name.replace(/\s+/g, ' ').trim()
  return name
}

export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

export function similarityScore(a: string, b: string): number {
  const distance = levenshtein(a, b)
  const maxLen = Math.max(a.length, b.length)
  return maxLen === 0 ? 1 : 1 - distance / maxLen
}

export function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(' ').filter(Boolean))
  const tokensB = new Set(b.split(' ').filter(Boolean))
  const intersection = [...tokensA].filter(t => tokensB.has(t)).length
  const union = new Set([...tokensA, ...tokensB]).size
  return union === 0 ? 0 : intersection / union
}

/**
 * Compare two team names directly (not via a title string).
 * Returns true if they are likely the same team.
 */
export function teamsMatch(a: string, b: string, threshold = 0.65): boolean {
  const nA = normalizeForMatch(a)
  const nB = normalizeForMatch(b)
  if (!nA || !nB) return false

  const score = (similarityScore(nA, nB) + tokenSimilarity(nA, nB)) / 2
  if (score >= threshold) return true

  // Substring fallback: "grambling" inside "gramblingstate" — requires both strings be long enough
  // to avoid false positives like "sacramento" matching "sacramento st" vs "sacramento kings"
  const flatA = nA.replace(/\s+/g, '')
  const flatB = nB.replace(/\s+/g, '')
  const shorter = Math.min(flatA.length, flatB.length)
  const longer = Math.max(flatA.length, flatB.length)
  // Only use substring match if: both are long enough AND the shorter is at least 75% of the longer
  // This prevents "grambling" (9) matching "gramblingstate" (14) ✓ but blocks "miami" (5) matching anything
  if (shorter >= 8 && shorter / longer >= 0.6) {
    if (flatA.includes(flatB) || flatB.includes(flatA)) return true
  }

  return false
}

/**
 * Match a pick's home+away against an ESPN game's home+away.
 * Tries both direct and swapped orientation (home/away may differ by source).
 */
export function gameTeamsMatch(
  pickHome: string, pickAway: string,
  espnHome: string, espnAway: string,
  threshold = 0.65
): boolean {
  const directMatch = teamsMatch(pickHome, espnHome, threshold) && teamsMatch(pickAway, espnAway, threshold)
  const swappedMatch = teamsMatch(pickHome, espnAway, threshold) && teamsMatch(pickAway, espnHome, threshold)
  return directMatch || swappedMatch
}
