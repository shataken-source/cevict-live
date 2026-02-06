#!/usr/bin/env node
/**
 * NBA win probability predictor (standalone, no progno or existing code).
 * Usage: npm run predict [HOME_ABBR AWAY_ABBR]
 * Example: npm run predict BOS LAL
 */

import { winProbability } from "./probability";
import { getTeamByAbbr, listTeams } from "./teams";

function main(): void {
  const args = process.argv.slice(2);
  const homeAbbr = args[0]?.toUpperCase();
  const awayAbbr = args[1]?.toUpperCase();

  if (!homeAbbr || !awayAbbr) {
    console.log("NBA Win Probability Predictor\n");
    console.log("Usage: npm run predict HOME_ABBR AWAY_ABBR");
    console.log("Example: npm run predict BOS LAL\n");
    console.log("Teams (by rating):");
    listTeams().forEach((t) => {
      console.log(`  ${t.abbr.padEnd(4)} ${t.name} (${t.rating})`);
    });
    console.log("\nSample: BOS vs LAL");
    runPrediction("BOS", "LAL");
    return;
  }

  runPrediction(homeAbbr, awayAbbr);
}

function runPrediction(homeAbbr: string, awayAbbr: string): void {
  const home = getTeamByAbbr(homeAbbr);
  const away = getTeamByAbbr(awayAbbr);

  if (!home) {
    console.error(`Unknown team: ${homeAbbr}`);
    process.exit(1);
  }
  if (!away) {
    console.error(`Unknown team: ${awayAbbr}`);
    process.exit(1);
  }

  const homeWinProb = winProbability(home.rating, away.rating);
  const awayWinProb = 1 - homeWinProb;

  console.log(`\n${home.name} (home) vs ${away.name} (away)\n`);
  console.log(`  ${home.name}: ${(homeWinProb * 100).toFixed(1)}%`);
  console.log(`  ${away.name}: ${(awayWinProb * 100).toFixed(1)}%\n`);
}

main();
