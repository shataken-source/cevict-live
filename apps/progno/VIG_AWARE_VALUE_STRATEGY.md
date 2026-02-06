# Vig-Aware Value Strategy (AI vs Vegas)

Experiment: can AI beat Las Vegas by focusing on **value** (edge + EV) instead of volume?

## Flow: Odds → Probability → Picks

1. **Odds**  
   - The Odds API: `h2h`, `spreads`, `totals` for all 6 sports (NFL, NBA, NHL, MLB, NCAAF, NCAAB).  
   - Consensus from **5 bookmakers** (was 3) to reduce single-book bias.

2. **Probability**  
   - **Vig removal:** Raw implied prob from American odds is `implied_home`, `implied_away`.  
     No-vig: `homeProb = implied_home / (implied_home + implied_away)`, same for away.  
     Edge is now “our model vs true market,” not vs vig.  
   - **7D Claude Effect:** Adjusts home/away prob (SF, NM, IAI, CSI, NIG, TRD, EPD).  
   - **IAI (sharp signal):** Spread-implied win% vs moneyline-implied.  
     If spread says 55% home cover but ML says 60% home win, that gap is information asymmetry (sharp vs public). Sport-specific points-to-win% (e.g. NFL ~2% per point).  
   - **Monte Carlo:** 1500 sims per game.  
     **Odds-informed:** `estimateTeamStatsFromOdds(odds, sport)` gives expected points from spread/total, so MC isn’t “two league-average teams”—it’s Vegas-informed, then we look for **value** where our sim disagrees with market.  
   - **Value bets:** `detectValueBets()` finds ML/spread/total edges where model prob > implied (min 3% edge).

3. **Picks**  
   - **Composite score (Vig-Aware Value):**  
     `normalizedEdge*35 + normalizedEV*35 + (confidence/100)*20 + tripleAlign?20 : 0 + hasValue?10 : 0`  
     Penalty `-8` if edge < 2% and not triple-aligned.  
   - **Top 10:** Sort by composite; take up to **3 per sport** so all 6 leagues can appear.  
   - **Triple Alignment:** Model pick + value bet side + Monte Carlo agree → bonus.

## What’s different (vs “80+ picks”)

- **Top 10 only**, ranked by **edge and EV** first, then confidence.  
- **No-vig baseline** so we’re not chasing vig.  
- **Spread-vs-ML** as a sharp signal (IAI).  
- **Odds-informed Monte Carlo** so sims reflect market view; we only bet when we **disagree** with value.  
- **All 6 sports** included; diversity via max 3 per sport in top 10.

## How to use

- `GET /api/picks/today` returns the top 10 picks (and metadata).  
- Response includes `strategy: 'Vig-Aware Value: ...'` and `technology.consensus_odds: 'Up to 5 bookmakers ...'`.

## Files touched

| File | Change |
|------|--------|
| `app/api/picks/today/route.ts` | Vig removal, 5-book consensus, spread-vs-ML IAI, odds-informed MC (teamStats), composite score reweight, 1500 MC iters |
| `app/lib/odds-helpers.ts` | (unchanged) `estimateTeamStatsFromOdds` used by picks/today |
