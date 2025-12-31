# 🔍 TRADING BOT FLOW ANALYSIS REPORT

## Executive Summary

This document analyzes the complete trading flow executed before any trades are placed in the Alpha Hunter bot, identifies issues, and provides recommendations for optimization.

---

## 1. PRE-TRADE VALIDATION FLOW

### Current Flow (Before Trade Execution)

#### **CRYPTO TRADING FLOW:**

```
1. Main Loop Check
   ├─→ Check if running (isRunning flag)
   ├─→ Reset daily counters if new day
   ├─→ Check daily loss limit (-$25)
   └─→ Check daily spending limit ($50)

2. Position Limit Check
   ├─→ Count open crypto positions
   └─→ Proceed only if < 8 positions

3. Market Analysis (analyzeCrypto)
   ├─→ For each pair (BTC, ETH, SOL):
   │   ├─→ Fetch current price
   │   ├─→ Fetch 5-min candles
   │   ├─→ Calculate RSI (14-period)
   │   ├─→ Calculate MACD
   │   ├─→ Calculate Momentum
   │   ├─→ Get AI analysis (if Claude available)
   │   ├─→ Generate trading signal
   │   └─→ Check confidence >= minConfidence (55%)

4. Trade Execution (executeCryptoTrade)
   ├─→ CHECK: Daily spending limit
   │   └─→ Verify: (dailySpending + tradeSize) <= $50
   ├─→ CHECK: Type guard (buy/sell only)
   ├─→ EXECUTE: coinbase.marketOrder()
   ├─→ Record fees
   ├─→ Record spending
   ├─→ Create position object
   └─→ Save trade to memory
```

#### **KALSHI TRADING FLOW:**

```
1. Main Loop Check
   ├─→ Check time since last Kalshi scan (60s interval)
   ├─→ Check if kalshiOpenBets < 10
   └─→ Check daily spending limit

2. Market Fetch & Filter
   ├─→ Fetch all Kalshi markets
   ├─→ FILTER: Already bet on (kalshiBetMarkets Set)
   ├─→ FILTER: Expiration > 3 days (short-term only)
   ├─→ FILTER: Expiration < 0 (expired)
   ├─→ PRIORITIZE: Sports markets first
   └─→ PRIORITIZE: Entertainment second

3. Market Analysis (analyzeKalshiMarket)
   ├─→ CHECK: PROGNO Flex picks (sports only)
   ├─→ CHECK: GME Specialist (GME-related)
   ├─→ CHECK: Derivatives Expert (derivatives markets)
   ├─→ CHECK: Futures Expert (futures markets)
   ├─→ CHECK: Entertainment Expert (entertainment)
   ├─→ CHECK: Category Learners (all categories)
   ├─→ Calculate edge (AI prediction vs market price)
   └─→ Check minimum edge requirement

4. Edge Validation (Dynamic Thresholds)
   ├─→ Sports: 1.0% base edge (0.5% if high confidence)
   ├─→ Entertainment: 1.5% base edge (1.0% if high confidence)
   ├─→ Other: 2.0% base edge
   └─→ Adjust for expiration date (longer = higher edge)

5. Trade Execution
   ├─→ CHECK: Final balance check (leave $0.50 buffer)
   ├─→ CHECK: Stake >= $1
   ├─→ CHECK: Daily spending limit
   ├─→ EXECUTE: kalshi.placeBet()
   ├─→ Mark market as bet on (never bet again)
   ├─→ Record fees
   ├─→ Record spending
   ├─→ Create position object
   └─→ Save trade to memory
```

---

## 2. ISSUES IDENTIFIED

### 🔴 CRITICAL ISSUES

#### Issue 1: No Balance Verification Before Crypto Trades
**Location:** `executeCryptoTrade()` (Line 375-452)
**Problem:** 
- Bot checks daily spending limit but NOT actual Coinbase balance
- Could attempt trades with insufficient funds
- No validation that USD balance >= trade size

**Impact:** HIGH - Can cause failed trades and wasted API calls

**Fix Required:**
```typescript
// Add before line 392
const usdBalance = await this.coinbase.getUSDBalance();
if (signal.action === 'buy' && usdBalance < signal.suggestedSize) {
  console.log(`   ${color.warning('⚠️ Insufficient USD balance')}`);
  console.log(`   ${c.dim}Need:${c.reset} ${color.money('$' + signal.suggestedSize.toFixed(2))} | ${c.dim}Have:${c.reset} ${color.money('$' + usdBalance.toFixed(2))}`);
  return false;
}

// For sells, check crypto balance
if (signal.action === 'sell') {
  const symbol = signal.symbol.split('-')[0];
  const cryptoBalance = await this.coinbase.getCryptoBalance(symbol);
  const requiredAmount = signal.suggestedSize / (await this.coinbase.getPrice(signal.symbol));
  if (cryptoBalance < requiredAmount) {
    console.log(`   ${color.warning('⚠️ Insufficient ' + symbol + ' balance')}`);
    return false;
  }
}
```

#### Issue 2: Race Condition in Position Counting
**Location:** Multiple places checking `positions.length`
**Problem:**
- Position count checked at start of cycle (line 1527)
- Multiple operations could execute before position is added
- Could exceed max position limit

**Impact:** MEDIUM - Could open more than 8 crypto positions

**Fix Required:**
- Add mutex/lock around position modifications
- Re-check position count immediately before trade execution

#### Issue 3: No Duplicate Market Prevention for Crypto
**Location:** `analyzeCrypto()` and `executeCryptoTrade()`
**Problem:**
- Kalshi has `kalshiBetMarkets` Set to prevent duplicate bets
- Crypto has NO mechanism to prevent buying same pair twice in quick succession
- Could open multiple BTC positions if conditions stay favorable

**Impact:** MEDIUM - Position concentration risk

**Fix Required:**
```typescript
private cryptoOpenPositions: Map<string, Position> = new Map();

// In executeCryptoTrade, before line 392:
if (this.cryptoOpenPositions.has(signal.symbol)) {
  console.log(`   ${color.warning('⚠️ Already have open position in ' + signal.symbol)}`);
  return false;
}
```

### 🟡 MODERATE ISSUES

#### Issue 4: Fee Calculation Discrepancy
**Location:** Lines 407-408, 478-481
**Problem:**
- Entry fees: `trade.fees || (suggestedSize * 0.006)`
- Exit fees: Always `suggestedSize * 0.006`
- Fees calculated on USD amount, but should be on crypto value for sells
- Fee calculation doesn't account for actual Coinbase maker/taker rates (0.4-0.6%)

**Impact:** MEDIUM - Inaccurate P&L calculations

**Fix Required:**
```typescript
// Update fee calculation to use actual rates
const COINBASE_TAKER_FEE = 0.006; // 0.6% for market orders
const COINBASE_MAKER_FEE = 0.004; // 0.4% for limit orders

// For sells, calculate fees on crypto value
const tradeValue = signal.action === 'buy' ? signal.suggestedSize : (signal.suggestedSize / currentPrice) * currentPrice;
const entryFees = tradeValue * COINBASE_TAKER_FEE;
```

#### Issue 5: Missing Slippage Protection
**Location:** All market order executions
**Problem:**
- Uses market orders with no price limits
- No maximum slippage check
- Could execute at unfavorable prices during volatility

**Impact:** MEDIUM - Potential for bad fills

**Fix Required:**
- Add slippage tolerance check
- Validate fill price vs expected price
- Abort if slippage > threshold

#### Issue 6: Kalshi Balance Not Refreshed Between Bets
**Location:** Line 753, 988
**Problem:**
- Kalshi balance cached at start of cycle (line 753)
- Balance updated locally (line 988) but not re-fetched
- If bet fails partially, cached balance is wrong

**Impact:** LOW-MEDIUM - Could cause balance errors

**Fix Required:**
- Re-fetch balance after failed bets
- Validate balance before each bet, not just at cycle start

### 🟢 MINOR ISSUES

#### Issue 7: Inconsistent Confidence Thresholds
**Location:** Multiple locations
**Problem:**
- Global CONFIG.minConfidence = 55%
- Entertainment Expert uses 45% (line 1312)
- GME Specialist uses 55% (line 1164)
- Category learners use varying thresholds
- Inconsistent and confusing

**Fix:** Standardize or document reasoning

#### Issue 8: Learning Adaptation Can Backfire
**Location:** Lines 618-625
**Problem:**
- If win rate < 40%, raises minConfidence by 5%
- If win rate > 70%, lowers minConfidence by 2%
- During losing streaks, becomes MORE conservative (good)
- But doesn't reset, could eventually reach 80% and never trade
- No documentation of why 40% and 70% thresholds chosen

**Fix:** Add bounds and better logic

---

## 3. RISK MANAGEMENT ANALYSIS

### Current Risk Parameters

```typescript
CONFIG = {
  maxTradeSize: 5,           // $5 max per trade
  minConfidence: 55,         // 55% minimum confidence
  maxOpenPositions: 5,       // Max 5 total (but code checks 8 crypto + 10 Kalshi = 15 total!)
  dailyLossLimit: 25,        // Stop if down $25
  dailySpendingLimit: 50,    // Max $50 spent per day
  takeProfitPercent: 1.5,    // +1.5% take profit
  stopLossPercent: 2.5,      // -2.5% stop loss
}
```

### Issues with Current Limits

1. **Inconsistent Position Limits:**
   - CONFIG says `maxOpenPositions: 5`
   - Code allows 8 crypto + 10 Kalshi = **18 total positions**
   - Should be consistent

2. **Spending vs Loss Limits:**
   - Daily spending: $50
   - Daily loss: $25
   - If all trades go to -2.5% stop loss: $50 * 0.025 = $1.25 loss
   - Loss limit is 20x the expected loss
   - **Spending limit more restrictive than loss limit**

3. **Take Profit Too Tight:**
   - +1.5% profit target
   - 0.6% entry + 0.6% exit fees = 1.2% fees
   - **Net profit: 0.3%** (only 25% of gross)
   - Risk/reward: 0.3% gain / 2.5% loss = **1:8.3 ratio** (terrible!)

4. **Fee Impact Underestimated:**
   - Every round trip costs 1.2% in fees
   - Need +1.2% move just to break even
   - With ±2% bid-ask spread, need +3.2% to profit
   - Current 1.5% target doesn't account for this

---

## 4. RECOMMENDATIONS

### Immediate Fixes (Priority 1)

1. ✅ **Add balance validation before all trades**
2. ✅ **Prevent duplicate crypto positions**
3. ✅ **Fix position limit inconsistency**
4. ✅ **Correct fee calculations**
5. ✅ **Add slippage protection**

### Risk Parameter Optimization (Priority 2)

Based on fee analysis and risk/reward ratios:

```typescript
RECOMMENDED_CONFIG = {
  // Position Sizing
  maxTradeSize: 5,              // Keep at $5 (good for testing)
  minConfidence: 60,            // Raise to 60% (more selective)
  maxOpenPositions: 8,          // 5 crypto + 3 Kalshi (consistent)
  
  // Daily Limits
  dailyLossLimit: 15,           // Lower to $15 (3 full stop losses)
  dailySpendingLimit: 40,       // Lower to $40 (8 max trades)
  
  // Profit Targets (IMPROVED)
  takeProfitPercent: 3.0,       // Raise to 3% (2x fees minimum)
  stopLossPercent: 2.0,         // Tighten to 2% (better risk/reward)
  
  // New Parameters
  maxSlippagePercent: 0.5,      // Max 0.5% slippage allowed
  minRiskRewardRatio: 1.5,      // Min 1.5:1 reward/risk
  
  // Adaptive Confidence
  confidenceFloor: 55,          // Never go below 55%
  confidenceCeiling: 75,        // Never go above 75%
}
```

### Why These Numbers?

- **Take Profit 3%:** 3.0% - 1.2% fees = 1.8% net profit
- **Stop Loss 2%:** 2.0% + 1.2% fees = 3.2% net loss
- **Risk/Reward:** 1.8% / 3.2% = 1:1.78 (acceptable)
- **Daily Loss $15:** = 3 full stop losses = 6 trades at $5
- **Max Positions 8:** Diversification without overextension

---

## 5. VALIDATION CHECKLIST

Before each trade, the bot should validate:

### ✅ PRE-TRADE CHECKLIST

```
[ ] System Status
    [ ] Bot is running (isRunning = true)
    [ ] Not shutting down
    [ ] APIs are connected

[ ] Daily Limits
    [ ] Daily P&L > -dailyLossLimit
    [ ] Daily spending < dailySpendingLimit
    [ ] New day reset checked

[ ] Position Limits
    [ ] Total positions < maxOpenPositions
    [ ] Platform-specific positions within limits
    [ ] No duplicate positions in same symbol

[ ] Balance Verification
    [ ] Sufficient USD balance (for buys)
    [ ] Sufficient crypto balance (for sells)
    [ ] Leave buffer for fees ($0.50 minimum)

[ ] Signal Validation
    [ ] Confidence >= minConfidence
    [ ] Edge >= minEdge (Kalshi)
    [ ] Risk/reward ratio acceptable

[ ] Trade Parameters
    [ ] Trade size >= $1 (Kalshi minimum)
    [ ] Trade size <= maxTradeSize
    [ ] Valid symbol/market
    [ ] Valid side (buy/sell/yes/no)

[ ] Market Conditions (Kalshi)
    [ ] Market not expired
    [ ] Expiration within acceptable range
    [ ] Not already bet on this market
    [ ] Market has sufficient liquidity

[ ] Execution Ready
    [ ] All pre-checks passed
    [ ] Trade size calculated correctly
    [ ] Fees estimated accurately
    [ ] Slippage protection in place
```

---

## 6. NEXT STEPS

1. **Implement fixes** for critical issues
2. **Run simulations** with new risk parameters
3. **A/B test** old vs new configurations
4. **Monitor** for 48 hours before full rollout
5. **Document** all changes and reasoning

---

**Status:** ANALYSIS COMPLETE - Ready for simulation
**Date:** December 31, 2025
**Analyst:** AI Assistant

