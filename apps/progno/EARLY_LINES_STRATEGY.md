# Early Lines + Line-Move “Arb” (Experimental)

Early lines (2–5 days ahead) can move a lot by game time. Injury, suspension, or news can flip the market. That creates a possible **same-game line-move play**:

1. **Lock in early**  
   Bet one side at the early line (e.g. Team A +300) when the early-run says it’s value.

2. **News hits**  
   QB/star out, suspension, etc. Line moves: Team A drifts to +500 or the other side (Team B) becomes a heavy favorite.

3. **Regular run (0–2 days)**  
   Closer to game day, the regular run might now say **bet the other side** (Team B) at the new odds.

4. **Effect**  
   You already have Team A at the old (better) price. If you also take Team B at the new price when the model says it’s value, you’re not classic arbitrage (guaranteed profit), but you’re:
   - **Hedging** with a second bet that the model likes, or  
   - **Same-game “arb”** in the sense that you have both sides at prices that were +EV at the time you bet — the early line on A, the new line on B after the move.

## Why it’s experimental

- Early lines are thinner; one book or a slow move can make the “value” noisier.  
- News might not happen; then you only have the early bet.  
- The regular run might still like the same side (no flip), so no “other side” bet.  
- Best case: early position on A, then B at a sharp number after overreaction to news.

## How we support it

- **Early run** → `predictions-early-YYYY-MM-DD.json` (games 2–5 days out).  
- **Regular run** → `predictions-YYYY-MM-DD.json` (games 0–2 days out).  
- **Same game** appears in both when it moves from “2–5 days” into “0–2 days.”  
- **Admin: Early vs Regular** compares by `game_id`: for each game in both files, shows early pick + odds vs regular pick + odds. If the **pick flips to the other side**, we flag it as a possible line-move arb/hedge: you have the early position; the regular run now likes the other side at the new number.

## Summary

Bet the early line when it’s value; if news moves the line and the regular run later says bet the other side, that second bet can act as a hedge or a second +EV leg — “arb” in the sense of two good prices on the same game, not risk-free lock.
