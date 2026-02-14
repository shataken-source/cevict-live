"""
ALPHA-HUNTER MASSAGER COMMANDS
==============================
New commands specifically designed for the Alpha-Hunter trading workflow.
These commands PRE-FILTER opportunities BEFORE calling Claude API to save money.

Philosophy: Use cheap computation (Massager) to filter down to high-value 
opportunities, THEN use expensive AI (Claude) only on the best candidates.

New Commands:
12. Quick Edge Scanner - Fast math-only edge detection
13. Volume/Liquidity Filter - Skip illiquid markets
14. Category Confidence - Use historical category performance
15. Pre-AI Confidence Score - Compute score WITHOUT AI
16. AI Worthiness Check - Should we even call Claude?
17. Kalshi Price Efficiency - Check for mispriced Kalshi markets
18. Crypto Momentum Score - Quick crypto technical analysis
19. Smart Batch Filter - Batch filter markets before AI
"""

import pandas as pd
import numpy as np
from typing import Tuple, Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass


@dataclass
class PreFilterResult:
    """Result of pre-filtering before Claude API call"""
    should_analyze_with_ai: bool
    pre_confidence: float
    pre_edge: float
    quick_reasoning: List[str]
    skip_reason: Optional[str] = None


@dataclass
class MarketOpportunity:
    """Standardized market opportunity for filtering"""
    id: str
    title: str
    category: str
    yes_price: float  # 0-100
    no_price: float   # 0-100
    volume: float
    expires_at: Optional[datetime] = None
    extra: Dict = None


class AlphaHunterMassager:
    """
    Specialized Massager for Alpha-Hunter trading bot.
    Focuses on reducing Claude API calls while maintaining quality.
    """
    
    # Historical category performance (updated from bot learning)
    CATEGORY_BASELINES = {
        'crypto': {'win_rate': 0.52, 'avg_edge': 2.1, 'confidence_boost': 0},
        'politics': {'win_rate': 0.58, 'avg_edge': 4.2, 'confidence_boost': 5},
        'economics': {'win_rate': 0.55, 'avg_edge': 3.5, 'confidence_boost': 3},
        'weather': {'win_rate': 0.48, 'avg_edge': 1.5, 'confidence_boost': -5},
        'entertainment': {'win_rate': 0.51, 'avg_edge': 2.8, 'confidence_boost': 0},
        'sports': {'win_rate': 0.54, 'avg_edge': 3.0, 'confidence_boost': 2},
        'world': {'win_rate': 0.50, 'avg_edge': 2.0, 'confidence_boost': 0},
    }
    
    # Minimum thresholds to warrant AI analysis
    MIN_EDGE_FOR_AI = 2.0  # Don't call Claude if edge < 2%
    MIN_VOLUME_FOR_AI = 100  # Skip low-volume markets
    MIN_PRE_CONFIDENCE = 52  # Must show some signal
    MAX_AI_CALLS_PER_BATCH = 5  # Limit AI calls per scan
    
    def __init__(self):
        self.command_log: List[Dict] = []
        
    # ========================================
    # COMMAND 12: QUICK EDGE SCANNER
    # ========================================
    
    def cmd_quick_edge_scan(self, markets: List[Dict]) -> Tuple[List[Dict], str]:
        """
        Fast math-only edge detection. NO AI, just probability math.
        Identifies markets where price seems wrong based on:
        - Price clustering (many markets near 50% = uncertain)
        - Extreme prices (very high/low = usually efficient)
        - Price vs category baseline
        """
        results = []
        
        for market in markets:
            yes_price = market.get('yes_price', market.get('yesPrice', 50))
            no_price = market.get('no_price', market.get('noPrice', 50))
            category = market.get('category', 'world')
            
            # Get category baseline
            baseline = self.CATEGORY_BASELINES.get(category, self.CATEGORY_BASELINES['world'])
            
            # Calculate quick edge indicators
            edge_score = 0
            reasons = []
            
            # 1. Mid-range prices have more edge potential
            distance_from_50 = abs(yes_price - 50)
            if 15 <= distance_from_50 <= 35:
                edge_score += 2
                reasons.append(f"Mid-range price ({yes_price}¢)")
            elif distance_from_50 < 10:
                edge_score += 1
                reasons.append("Near 50/50 - high uncertainty")
            
            # 2. Price inefficiency check (yes + no should = ~100)
            total_price = yes_price + no_price
            if total_price < 98:  # Potential arb
                edge_score += 3
                reasons.append(f"Price gap: {100 - total_price:.1f}%")
            elif total_price > 105:  # Overpriced
                edge_score -= 1
                reasons.append("Market overpriced")
            
            # 3. Category adjustment
            edge_score += baseline['confidence_boost'] / 5
            
            # 4. Calculate quick edge estimate
            # If market says 60% but category historically underprices
            historical_edge = baseline['avg_edge']
            quick_edge = max(0, edge_score * 0.8 + historical_edge * 0.2)
            
            market['quick_edge'] = round(quick_edge, 2)
            market['quick_reasons'] = reasons
            market['edge_score'] = edge_score
            results.append(market)
        
        # Sort by edge potential
        results.sort(key=lambda x: x.get('quick_edge', 0), reverse=True)
        
        high_edge = len([m for m in results if m.get('quick_edge', 0) >= self.MIN_EDGE_FOR_AI])
        return results, f"🔍 Quick scan: {high_edge}/{len(markets)} markets show edge potential"
    
    # ========================================
    # COMMAND 13: VOLUME/LIQUIDITY FILTER
    # ========================================
    
    def cmd_volume_filter(self, markets: List[Dict], 
                          min_volume: float = None) -> Tuple[List[Dict], str]:
        """
        Filter out illiquid markets. Low volume = hard to execute, wide spreads.
        """
        min_vol = min_volume or self.MIN_VOLUME_FOR_AI
        
        filtered = []
        skipped = 0
        
        for market in markets:
            volume = market.get('volume', 0)
            
            if volume >= min_vol:
                market['liquidity_ok'] = True
                filtered.append(market)
            else:
                market['liquidity_ok'] = False
                market['skip_reason'] = f"Low volume ({volume})"
                skipped += 1
        
        return filtered, f"💧 Liquidity filter: {len(filtered)} pass, {skipped} skipped (min vol: {min_vol})"
    
    # ========================================
    # COMMAND 14: CATEGORY CONFIDENCE
    # ========================================
    
    def cmd_category_confidence(self, markets: List[Dict], 
                                 historical_performance: Dict = None) -> Tuple[List[Dict], str]:
        """
        Adjust confidence based on historical category performance.
        Uses bot's past win rates per category.
        """
        perf = historical_performance or self.CATEGORY_BASELINES
        
        for market in markets:
            category = market.get('category', 'world')
            baseline = perf.get(category, perf.get('world', {'win_rate': 0.50}))
            
            # Base confidence from historical win rate
            base_conf = baseline.get('win_rate', 0.50) * 100
            boost = baseline.get('confidence_boost', 0)
            
            market['category_confidence'] = round(base_conf + boost, 1)
            market['category_win_rate'] = baseline.get('win_rate', 0.50)
        
        return markets, f"📊 Category confidence applied based on historical performance"
    
    # ========================================
    # COMMAND 15: PRE-AI CONFIDENCE SCORE
    # ========================================
    
    def cmd_pre_ai_confidence(self, markets: List[Dict]) -> Tuple[List[Dict], str]:
        """
        Calculate a confidence score WITHOUT calling Claude.
        Combines: quick_edge + category_confidence + volume + time factors
        """
        for market in markets:
            score = 50  # Start at baseline
            reasons = []
            
            # 1. Quick edge contribution (0-10 points)
            quick_edge = market.get('quick_edge', 0)
            score += min(10, quick_edge * 2)
            if quick_edge > 2:
                reasons.append(f"Edge signal: +{min(10, quick_edge * 2):.0f}")
            
            # 2. Category confidence (0-10 points)
            cat_conf = market.get('category_confidence', 50)
            cat_boost = (cat_conf - 50) / 2
            score += cat_boost
            if cat_boost > 2:
                reasons.append(f"Category: +{cat_boost:.0f}")
            
            # 3. Volume bonus (0-5 points)
            volume = market.get('volume', 0)
            if volume > 1000:
                score += 5
                reasons.append("High volume: +5")
            elif volume > 500:
                score += 3
                reasons.append("Good volume: +3")
            elif volume > 100:
                score += 1
            
            # 4. Time to expiry factor
            expires_at = market.get('expires_at')
            if expires_at:
                try:
                    if isinstance(expires_at, str):
                        exp_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                    else:
                        exp_date = expires_at
                    
                    days_left = (exp_date - datetime.now(exp_date.tzinfo)).days
                    
                    if days_left < 1:
                        score -= 5  # Too close to expiry
                        reasons.append("Expiring soon: -5")
                    elif days_left < 3:
                        score += 2  # Sweet spot
                        reasons.append("Near expiry: +2")
                except:
                    pass
            
            # 5. Price reasonableness
            yes_price = market.get('yes_price', market.get('yesPrice', 50))
            if 20 <= yes_price <= 80:
                score += 2  # Tradeable range
            
            market['pre_ai_confidence'] = round(min(85, max(40, score)), 1)
            market['pre_ai_reasons'] = reasons
        
        return markets, f"🧮 Pre-AI confidence calculated for {len(markets)} markets"
    
    # ========================================
    # COMMAND 16: AI WORTHINESS CHECK
    # ========================================
    
    def cmd_ai_worthiness(self, markets: List[Dict]) -> Tuple[List[Dict], str]:
        """
        The GATEKEEPER: Decide if a market is worth calling Claude API.
        
        Returns markets with 'worth_ai_call' boolean and reasoning.
        Only TRUE markets should proceed to Claude analysis.
        """
        worthy = []
        unworthy = []
        
        for market in markets:
            worth = True
            skip_reason = None
            
            # Check pre-AI confidence
            pre_conf = market.get('pre_ai_confidence', 50)
            if pre_conf < self.MIN_PRE_CONFIDENCE:
                worth = False
                skip_reason = f"Low pre-confidence ({pre_conf:.0f}%)"
            
            # Check quick edge
            quick_edge = market.get('quick_edge', 0)
            if quick_edge < self.MIN_EDGE_FOR_AI:
                worth = False
                skip_reason = f"Low edge potential ({quick_edge:.1f}%)"
            
            # Check liquidity
            if not market.get('liquidity_ok', True):
                worth = False
                skip_reason = market.get('skip_reason', 'Low liquidity')
            
            # Check if already analyzed recently (would need cache)
            # if market.get('last_ai_analysis') and was_recent:
            #     worth = False
            #     skip_reason = "Recently analyzed"
            
            market['worth_ai_call'] = worth
            market['ai_skip_reason'] = skip_reason
            
            if worth:
                worthy.append(market)
            else:
                unworthy.append(market)
        
        # Limit worthy markets to max AI calls
        if len(worthy) > self.MAX_AI_CALLS_PER_BATCH:
            # Sort by pre_ai_confidence and take top N
            worthy.sort(key=lambda x: x.get('pre_ai_confidence', 0), reverse=True)
            overflow = worthy[self.MAX_AI_CALLS_PER_BATCH:]
            for m in overflow:
                m['worth_ai_call'] = False
                m['ai_skip_reason'] = 'Batch limit reached'
                unworthy.append(m)
            worthy = worthy[:self.MAX_AI_CALLS_PER_BATCH]
        
        return worthy + unworthy, f"🤖 AI worthy: {len(worthy)}/{len(markets)} (saving {len(unworthy)} API calls)"
    
    # ========================================
    # COMMAND 17: KALSHI PRICE EFFICIENCY
    # ========================================
    
    def cmd_kalshi_efficiency(self, markets: List[Dict]) -> Tuple[List[Dict], str]:
        """
        Check Kalshi-specific pricing efficiency.
        Kalshi has 7% taker fee, so need edge > 7% for taker orders.
        """
        KALSHI_TAKER_FEE = 0.07
        KALSHI_MAKER_FEE = 0.00
        
        for market in markets:
            yes_price = market.get('yes_price', market.get('yesPrice', 50)) / 100
            no_price = market.get('no_price', market.get('noPrice', 50)) / 100
            
            # Calculate implied probabilities
            implied_yes = yes_price / (yes_price + no_price) if (yes_price + no_price) > 0 else 0.5
            
            # For a YES bet at price P to be profitable:
            # Expected return = (1/P) - 1 - fee must be > 0
            # So need: edge > fee / (1 - fee)
            
            min_edge_needed = KALSHI_TAKER_FEE * 100  # 7% for taker
            
            market['kalshi_min_edge'] = min_edge_needed
            market['kalshi_maker_viable'] = True  # Maker has no fee
            market['kalshi_taker_viable'] = market.get('quick_edge', 0) > min_edge_needed
            
            # Check for efficiency vs other prediction markets (if data available)
            market['kalshi_implied_prob'] = round(implied_yes * 100, 1)
        
        taker_viable = len([m for m in markets if m.get('kalshi_taker_viable')])
        return markets, f"💰 Kalshi efficiency: {taker_viable} taker-viable, all maker-viable"
    
    # ========================================
    # COMMAND 18: CRYPTO MOMENTUM SCORE
    # ========================================
    
    def cmd_crypto_momentum(self, prices: List[Dict]) -> Tuple[List[Dict], str]:
        """
        Quick crypto technical analysis WITHOUT AI.
        Calculates momentum, RSI approximation, and trend.
        """
        for crypto in prices:
            candles = crypto.get('candles', [])
            current_price = crypto.get('price', 0)
            
            momentum_score = 50  # Neutral
            reasons = []
            
            if len(candles) >= 5:
                closes = [c.get('close', c.get('c', 0)) for c in candles[-20:]]
                
                if len(closes) >= 5:
                    # Simple momentum: compare recent vs older
                    recent_avg = np.mean(closes[-5:])
                    older_avg = np.mean(closes[-10:-5]) if len(closes) >= 10 else closes[0]
                    
                    if older_avg > 0:
                        momentum_pct = (recent_avg - older_avg) / older_avg * 100
                        
                        if momentum_pct > 3:
                            momentum_score += 15
                            reasons.append(f"Strong uptrend: +{momentum_pct:.1f}%")
                        elif momentum_pct > 1:
                            momentum_score += 8
                            reasons.append(f"Uptrend: +{momentum_pct:.1f}%")
                        elif momentum_pct < -3:
                            momentum_score -= 15
                            reasons.append(f"Strong downtrend: {momentum_pct:.1f}%")
                        elif momentum_pct < -1:
                            momentum_score -= 8
                            reasons.append(f"Downtrend: {momentum_pct:.1f}%")
                    
                    # Simple RSI approximation
                    gains = [max(0, closes[i] - closes[i-1]) for i in range(1, len(closes))]
                    losses = [max(0, closes[i-1] - closes[i]) for i in range(1, len(closes))]
                    
                    avg_gain = np.mean(gains) if gains else 0
                    avg_loss = np.mean(losses) if losses else 0.001
                    
                    rs = avg_gain / avg_loss if avg_loss > 0 else 1
                    rsi = 100 - (100 / (1 + rs))
                    
                    if rsi > 70:
                        momentum_score -= 10  # Overbought
                        reasons.append(f"RSI overbought: {rsi:.0f}")
                    elif rsi < 30:
                        momentum_score += 10  # Oversold
                        reasons.append(f"RSI oversold: {rsi:.0f}")
                    
                    crypto['rsi'] = round(rsi, 1)
            
            # 24h change factor
            change_24h = crypto.get('change24h', crypto.get('change_24h', 0))
            if change_24h > 5:
                momentum_score += 5
                reasons.append(f"24h up: +{change_24h:.1f}%")
            elif change_24h < -5:
                momentum_score -= 5
                reasons.append(f"24h down: {change_24h:.1f}%")
            
            crypto['momentum_score'] = round(min(80, max(20, momentum_score)), 1)
            crypto['momentum_reasons'] = reasons
            crypto['worth_ai_call'] = momentum_score >= 55 or momentum_score <= 45
        
        ai_worthy = len([c for c in prices if c.get('worth_ai_call')])
        return prices, f"📈 Crypto momentum: {ai_worthy}/{len(prices)} worth AI analysis"
    
    # ========================================
    # COMMAND 19: SMART BATCH FILTER
    # ========================================
    
    def cmd_smart_batch_filter(self, markets: List[Dict], 
                                max_ai_calls: int = None) -> Tuple[List[Dict], str]:
        """
        Master filter: Run all pre-filters and return only AI-worthy markets.
        This is the MAIN command to call before any Claude API usage.
        
        Pipeline:
        1. Quick edge scan
        2. Volume filter
        3. Category confidence
        4. Pre-AI confidence
        5. AI worthiness check
        6. Return sorted by potential
        """
        max_calls = max_ai_calls or self.MAX_AI_CALLS_PER_BATCH
        
        # Run pipeline
        markets, _ = self.cmd_quick_edge_scan(markets)
        markets, _ = self.cmd_volume_filter(markets)
        markets, _ = self.cmd_category_confidence(markets)
        markets, _ = self.cmd_pre_ai_confidence(markets)
        markets, _ = self.cmd_ai_worthiness(markets)
        
        # Separate worthy and unworthy
        worthy = [m for m in markets if m.get('worth_ai_call')]
        unworthy = [m for m in markets if not m.get('worth_ai_call')]
        
        # Sort worthy by pre_ai_confidence
        worthy.sort(key=lambda x: x.get('pre_ai_confidence', 0), reverse=True)
        
        # Limit
        if len(worthy) > max_calls:
            overflow = worthy[max_calls:]
            for m in overflow:
                m['worth_ai_call'] = False
                m['ai_skip_reason'] = 'Batch limit'
            unworthy.extend(overflow)
            worthy = worthy[:max_calls]
        
        total_saved = len(unworthy)
        cost_saved = total_saved * 0.003  # Approximate cost per Claude call
        
        return worthy + unworthy, f"""
🎯 SMART BATCH FILTER RESULTS:
   ✅ AI-worthy: {len(worthy)} markets
   ⏭️  Skipped: {total_saved} markets
   💰 Est. savings: ${cost_saved:.3f} in API calls
   📊 Top opportunity: {worthy[0].get('title', 'N/A')[:40] if worthy else 'None'}...
"""
    
    # ========================================
    # UTILITY METHODS
    # ========================================
    
    def pre_filter_single(self, market: Dict) -> PreFilterResult:
        """
        Quick pre-filter for a single market.
        Returns whether it's worth calling Claude.
        """
        # Run through pipeline
        result, _ = self.cmd_smart_batch_filter([market], max_ai_calls=1)
        m = result[0]
        
        return PreFilterResult(
            should_analyze_with_ai=m.get('worth_ai_call', False),
            pre_confidence=m.get('pre_ai_confidence', 50),
            pre_edge=m.get('quick_edge', 0),
            quick_reasoning=m.get('pre_ai_reasons', []),
            skip_reason=m.get('ai_skip_reason')
        )
    
    def update_category_performance(self, category: str, won: bool, edge: float):
        """
        Update historical performance for a category.
        Call this after each bet resolves.
        """
        if category not in self.CATEGORY_BASELINES:
            self.CATEGORY_BASELINES[category] = {
                'win_rate': 0.50, 'avg_edge': 2.0, 'confidence_boost': 0,
                'total_bets': 0, 'wins': 0
            }
        
        baseline = self.CATEGORY_BASELINES[category]
        
        # Update running averages
        total = baseline.get('total_bets', 0) + 1
        wins = baseline.get('wins', 0) + (1 if won else 0)
        
        baseline['total_bets'] = total
        baseline['wins'] = wins
        baseline['win_rate'] = wins / total if total > 0 else 0.50
        
        # Update avg edge (exponential moving average)
        alpha = 0.1  # Weight for new data
        baseline['avg_edge'] = baseline['avg_edge'] * (1 - alpha) + edge * alpha
        
        # Update confidence boost
        if baseline['win_rate'] > 0.55:
            baseline['confidence_boost'] = min(10, (baseline['win_rate'] - 0.50) * 100)
        elif baseline['win_rate'] < 0.45:
            baseline['confidence_boost'] = max(-10, (baseline['win_rate'] - 0.50) * 100)
    
    def get_available_commands(self) -> List[str]:
        """Return list of Alpha-Hunter specific commands."""
        return [
            "Quick Edge Scanner (12)",
            "Volume/Liquidity Filter (13)",
            "Category Confidence (14)",
            "Pre-AI Confidence Score (15)",
            "AI Worthiness Check (16)",
            "Kalshi Price Efficiency (17)",
            "Crypto Momentum Score (18)",
            "Smart Batch Filter (19)",
        ]


# ========================================
# SINGLETON FACTORY
# ========================================

_massager_instance: Optional[AlphaHunterMassager] = None

def get_alpha_hunter_massager() -> AlphaHunterMassager:
    """Get singleton instance of Alpha-Hunter Massager."""
    global _massager_instance
    if _massager_instance is None:
        _massager_instance = AlphaHunterMassager()
    return _massager_instance


# ========================================
# QUICK USAGE EXAMPLE
# ========================================

if __name__ == "__main__":
    # Example usage
    massager = get_alpha_hunter_massager()
    
    # Sample markets
    test_markets = [
        {'id': '1', 'title': 'Will BTC hit $100k?', 'yes_price': 45, 'no_price': 58, 
         'volume': 5000, 'category': 'crypto'},
        {'id': '2', 'title': 'Fed rate cut in January?', 'yes_price': 22, 'no_price': 80, 
         'volume': 12000, 'category': 'economics'},
        {'id': '3', 'title': 'Oscar Best Picture', 'yes_price': 50, 'no_price': 52, 
         'volume': 50, 'category': 'entertainment'},  # Low volume - will skip
        {'id': '4', 'title': 'NFL game outcome', 'yes_price': 65, 'no_price': 38, 
         'volume': 3000, 'category': 'sports'},
    ]
    
    # Run smart batch filter
    filtered, message = massager.cmd_smart_batch_filter(test_markets, max_ai_calls=3)
    print(message)
    
    # Show results
    for m in filtered:
        status = "✅ AI" if m.get('worth_ai_call') else "⏭️  SKIP"
        print(f"{status}: {m['title'][:40]} - Conf: {m.get('pre_ai_confidence', 0):.0f}%, Edge: {m.get('quick_edge', 0):.1f}%")
        if m.get('ai_skip_reason'):
            print(f"      Reason: {m['ai_skip_reason']}")
