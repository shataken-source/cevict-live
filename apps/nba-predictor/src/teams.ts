/**
 * NBA team list and strength ratings (standalone, no external API).
 * Ratings are Elo-style; update with real results or replace with API data.
 */

export interface Team {
  id: string;
  name: string;
  abbr: string;
  rating: number;
}

export const NBA_TEAMS: Team[] = [
  { id: "atl", name: "Atlanta Hawks", abbr: "ATL", rating: 1520 },
  { id: "bos", name: "Boston Celtics", abbr: "BOS", rating: 1620 },
  { id: "bkn", name: "Brooklyn Nets", abbr: "BKN", rating: 1480 },
  { id: "cha", name: "Charlotte Hornets", abbr: "CHA", rating: 1420 },
  { id: "chi", name: "Chicago Bulls", abbr: "CHI", rating: 1500 },
  { id: "cle", name: "Cleveland Cavaliers", abbr: "CLE", rating: 1560 },
  { id: "dal", name: "Dallas Mavericks", abbr: "DAL", rating: 1580 },
  { id: "den", name: "Denver Nuggets", abbr: "DEN", rating: 1610 },
  { id: "det", name: "Detroit Pistons", abbr: "DET", rating: 1380 },
  { id: "gsw", name: "Golden State Warriors", abbr: "GSW", rating: 1550 },
  { id: "hou", name: "Houston Rockets", abbr: "HOU", rating: 1520 },
  { id: "ind", name: "Indiana Pacers", abbr: "IND", rating: 1540 },
  { id: "lac", name: "LA Clippers", abbr: "LAC", rating: 1570 },
  { id: "lal", name: "Los Angeles Lakers", abbr: "LAL", rating: 1530 },
  { id: "mem", name: "Memphis Grizzlies", abbr: "MEM", rating: 1490 },
  { id: "mia", name: "Miami Heat", abbr: "MIA", rating: 1540 },
  { id: "mil", name: "Milwaukee Bucks", abbr: "MIL", rating: 1590 },
  { id: "min", name: "Minnesota Timberwolves", abbr: "MIN", rating: 1580 },
  { id: "nop", name: "New Orleans Pelicans", abbr: "NOP", rating: 1510 },
  { id: "nyk", name: "New York Knicks", abbr: "NYK", rating: 1560 },
  { id: "okc", name: "Oklahoma City Thunder", abbr: "OKC", rating: 1600 },
  { id: "orl", name: "Orlando Magic", abbr: "ORL", rating: 1530 },
  { id: "phi", name: "Philadelphia 76ers", abbr: "PHI", rating: 1570 },
  { id: "phx", name: "Phoenix Suns", abbr: "PHX", rating: 1550 },
  { id: "por", name: "Portland Trail Blazers", abbr: "POR", rating: 1450 },
  { id: "sac", name: "Sacramento Kings", abbr: "SAC", rating: 1540 },
  { id: "sas", name: "San Antonio Spurs", abbr: "SAS", rating: 1460 },
  { id: "tor", name: "Toronto Raptors", abbr: "TOR", rating: 1480 },
  { id: "uta", name: "Utah Jazz", abbr: "UTA", rating: 1470 },
  { id: "was", name: "Washington Wizards", abbr: "WAS", rating: 1410 },
];

const byAbbr = new Map(NBA_TEAMS.map((t) => [t.abbr.toUpperCase(), t]));
const byId = new Map(NBA_TEAMS.map((t) => [t.id, t]));

export function getTeamByAbbr(abbr: string): Team | undefined {
  return byAbbr.get(abbr.toUpperCase());
}

export function getTeamById(id: string): Team | undefined {
  return byId.get(id.toLowerCase());
}

export function listTeams(): Team[] {
  return [...NBA_TEAMS].sort((a, b) => b.rating - a.rating);
}
