/**
 * ============================================================================
 * ELITE SPORTSBOOK ↔ KALSHI MATCH ENGINE
 * ============================================================================
 *
 * Features:
 * - Canonical team registry
 * - Alias resolution
 * - Saint/St normalization
 * - Mascot stripping
 * - Gender filtering
 * - Sport filtering (MBB, NCAAF, etc.)
 * - Token similarity scoring
 * - Levenshtein distance scoring
 * - Confidence scoring (0–1)
 *
 * Built for serious matching environments.
 * ============================================================================
 */

export type SportType = "MBB" | "WBB" | "NCAAF" | "NFL" | "NBA";

export interface SportsbookGame {
  homeTeam: string;
  awayTeam: string;
  sport: SportType;
}

export interface KalshiMarket {
  title: string;
  ticker: string;
  subtitle?: string;
}

export interface EliteMatchResult {
  isMatch: boolean;
  confidence: number; // 0-1
  matchedSide?: "direct" | "swapped";
}

/* ============================================================================
   CANONICAL TEAM REGISTRY
   (You can expand this over time)
============================================================================ */

interface TeamEntry {
  id: string;
  canonical: string;
  aliases: string[];
  sport: SportType;
}

const TEAM_REGISTRY: TeamEntry[] = [
  {
    id: "st_johns_mbb",
    canonical: "saint johns",
    aliases: ["st johns", "st. johns", "saint john's"],
    sport: "MBB",
  },
  {
    id: "uconn_mbb",
    canonical: "connecticut",
    aliases: ["uconn", "uconn huskies"],
    sport: "MBB",
  },
  {
    id: "lsu_mbb",
    canonical: "louisiana state",
    aliases: ["lsu"],
    sport: "MBB",
  },
  // ADD AS NEEDED
];

/* ============================================================================
   NORMALIZATION
============================================================================ */

const MASCOT_WORDS = [
  "wildcats", "bulldogs", "tigers", "eagles",
  "red storm", "huskies", "knights",
  "longhorns", "bruins", "gators",
];

function normalize(raw: string): string {
  let name = raw.toLowerCase();

  name = name.replace(/[.,'()-]/g, "");

  name = name.replace(/\bst\b|\bst\.\b/g, "saint");

  MASCOT_WORDS.forEach(word => {
    name = name.replace(new RegExp(`\\b${word}\\b`, "g"), "");
  });

  name = name.replace(/\s+/g, " ").trim();

  return name;
}

/* ============================================================================
   CANONICAL RESOLUTION
============================================================================ */

function resolveCanonical(name: string, sport: SportType): string {
  const normalized = normalize(name);

  for (const team of TEAM_REGISTRY) {
    if (team.sport !== sport) continue;

    if (normalized === team.canonical) return team.canonical;

    if (team.aliases.some(alias => normalize(alias) === normalized)) {
      return team.canonical;
    }
  }

  return normalized;
}

/* ============================================================================
   LEVENSHTEIN DISTANCE
============================================================================ */

function levenshtein(a: string, b: string): number {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function similarityScore(a: string, b: string): number {
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

/* ============================================================================
   TOKEN SIMILARITY
============================================================================ */

function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(" "));
  const tokensB = new Set(b.split(" "));

  const intersection = [...tokensA].filter(t => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;

  return union === 0 ? 0 : intersection / union;
}

/* ============================================================================
   SPORT + GENDER FILTER
============================================================================ */

function isWomensMarket(market: KalshiMarket): boolean {
  const text = `${market.title} ${market.subtitle ?? ""}`.toLowerCase();
  return text.includes("women") || text.includes("wbb");
}

function matchesSport(market: KalshiMarket, sport: SportType): boolean {
  const ticker = market.ticker.toUpperCase();
  return ticker.includes(sport);
}

/* ============================================================================
   TEAM EXTRACTION
============================================================================ */

function extractTeams(title: string): [string, string] {
  const lower = title.toLowerCase();

  if (lower.includes(" vs ")) {
    const [a, b] = lower.split(" vs ");
    return [a, b];
  }

  if (lower.includes(" @ ")) {
    const [away, home] = lower.split(" @ ");
    return [home, away];
  }

  return ["", ""];
}

/* ============================================================================
   MATCH ENGINE
============================================================================ */

export function eliteMatch(
  sportsbookGame: SportsbookGame,
  kalshiMarket: KalshiMarket
): EliteMatchResult {

  if (isWomensMarket(kalshiMarket)) {
    return { isMatch: false, confidence: 0 };
  }

  if (!matchesSport(kalshiMarket, sportsbookGame.sport)) {
    return { isMatch: false, confidence: 0 };
  }

  const [kA, kB] = extractTeams(kalshiMarket.title);

  const sbHome = resolveCanonical(sportsbookGame.homeTeam, sportsbookGame.sport);
  const sbAway = resolveCanonical(sportsbookGame.awayTeam, sportsbookGame.sport);

  const kalshiHome = resolveCanonical(kA, sportsbookGame.sport);
  const kalshiAway = resolveCanonical(kB, sportsbookGame.sport);

  const directScore =
    (similarityScore(sbHome, kalshiHome) +
     similarityScore(sbAway, kalshiAway) +
     tokenSimilarity(sbHome, kalshiHome) +
     tokenSimilarity(sbAway, kalshiAway)) / 4;

  const swappedScore =
    (similarityScore(sbHome, kalshiAway) +
     similarityScore(sbAway, kalshiHome) +
     tokenSimilarity(sbHome, kalshiAway) +
     tokenSimilarity(sbAway, kalshiHome)) / 4;

  if (directScore > 0.82) {
    return { isMatch: true, confidence: directScore, matchedSide: "direct" };
  }

  if (swappedScore > 0.82) {
    return { isMatch: true, confidence: swappedScore, matchedSide: "swapped" };
  }

  return {
    isMatch: false,
    confidence: Math.max(directScore, swappedScore),
  };
}