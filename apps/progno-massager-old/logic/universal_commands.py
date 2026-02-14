"""
PROGNO Universal Commands
=========================
Extends the 11 Massager Commands to work with ANY probability prediction,
not just sports. This makes PROGNO a universal probability engine.

New Domains:
- Prediction Markets (Kalshi, Polymarket)
- Stock/Options Probability
- Crypto Price Targets
- Weather/Climate Events
- AI Confidence Calibration
- Business/Economic Indicators
"""

import pandas as pd
import numpy as np
from typing import Tuple, Dict, List, Optional
from datetime import datetime, timedelta


class UniversalPrognoEngine:
    """
    Domain-agnostic probability calculation engine.
    Can be applied to ANY prediction scenario.
    """
    
    # ========================================
    # DOMAIN ADAPTERS
    # ========================================
    
    DOMAIN_CONFIGS = {
        'sports': {
            'home_bias': 0.05,        # 5% home advantage
            'momentum_threshold': 3,   # 3 game streak
            'momentum_impact': 0.10,   # 10% adjustment
            'time_decay_rate': 0.03,   # Decay per day
            'sentiment_weight': 0.05,  # 5% max sentiment impact
        },
        'prediction_markets': {
            'home_bias': 0.03,         # Incumbent/status quo bias
            'momentum_threshold': 2,    # 2 consecutive moves
            'momentum_impact': 0.08,    # 8% trend continuation
            'time_decay_rate': 0.01,    # Slower decay for events
            'sentiment_weight': 0.15,   # Higher social impact
        },
        'stocks': {
            'home_bias': 0.02,          # Slight bullish bias
            'momentum_threshold': 5,     # 5 day trend
            'momentum_impact': 0.05,     # 5% trend follow
            'time_decay_rate': 0.05,     # Faster decay
            'sentiment_weight': 0.10,    # Options flow impact
        },
        'crypto': {
            'home_bias': 0.00,          # No direction bias
            'momentum_threshold': 3,     # 3 day trend
            'momentum_impact': 0.15,     # Higher momentum
            'time_decay_rate': 0.10,     # Very fast decay
            'sentiment_weight': 0.20,    # High social correlation
        },
        'weather': {
            'home_bias': 0.00,          # No bias
            'momentum_threshold': 2,     # Weather patterns
            'momentum_impact': 0.12,     # Pattern continuation
            'time_decay_rate': 0.20,     # Very fast (forecasts stale quickly)
            'sentiment_weight': 0.02,    # Low social impact
        },
        'ai_confidence': {
            'home_bias': 0.00,          # No bias
            'momentum_threshold': 0,     # N/A
            'momentum_impact': 0.00,     # N/A
            'time_decay_rate': 0.00,     # N/A
            'sentiment_weight': 0.00,    # N/A
        }
    }
    
    def __init__(self, domain: str = 'sports'):
        self.domain = domain
        self.config = self.DOMAIN_CONFIGS.get(domain, self.DOMAIN_CONFIGS['sports'])
    
    def set_domain(self, domain: str):
        """Switch domain for calculations."""
        if domain in self.DOMAIN_CONFIGS:
            self.domain = domain
            self.config = self.DOMAIN_CONFIGS[domain]
        else:
            raise ValueError(f"Unknown domain: {domain}. Available: {list(self.DOMAIN_CONFIGS.keys())}")
    
    # ========================================
    # UNIVERSAL PROBABILITY COMMANDS
    # ========================================
    
    def cmd_status_quo_bias(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Universal "home bias" - favors current state/incumbent/trend.
        
        Sports: Home team advantage
        Politics: Incumbent advantage
        Markets: Status quo / current price level
        """
        bias = self.config['home_bias']
        
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Look for status quo indicator column
        sq_col = None
        for col in ['is_home', 'is_incumbent', 'is_current', 'is_status_quo', 'is_default']:
            if col in df.columns:
                sq_col = col
                break
        
        if sq_col:
            mask = df[sq_col].astype(bool)
            df.loc[mask, 'progno_score'] = (df.loc[mask, 'progno_score'] * (1 + bias)).clip(upper=0.99)
            affected = mask.sum()
        else:
            # Apply small bias to all (assumes predicting "yes" outcomes)
            df['progno_score'] = (df['progno_score'] * (1 + bias/2)).clip(upper=0.99)
            affected = len(df)
        
        return df, f"✅ Status quo bias applied ({self.domain}): {affected} rows (+{bias*100:.1f}%)"
    
    def cmd_trend_momentum(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Universal momentum - trend continuation bias.
        
        Sports: Win streak
        Stocks: Price trend
        Crypto: Multi-day move
        Prediction Markets: Consecutive probability moves
        """
        threshold = self.config['momentum_threshold']
        impact = self.config['momentum_impact']
        
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Find trend column
        trend_col = None
        for col in ['streak', 'trend', 'momentum', 'consecutive_days', 'trend_days']:
            if col in df.columns:
                trend_col = col
                break
        
        if not trend_col:
            # Try to calculate from price/probability change columns
            for col in ['change_pct', 'daily_change', 'prob_change']:
                if col in df.columns:
                    df['_calculated_trend'] = np.sign(df[col]).rolling(threshold).sum()
                    trend_col = '_calculated_trend'
                    break
        
        if trend_col:
            trend = df[trend_col].fillna(0).astype(float)
            
            # Positive trend boost
            pos_mask = trend >= threshold
            neg_mask = trend <= -threshold
            
            df.loc[pos_mask, 'progno_score'] = (df.loc[pos_mask, 'progno_score'] * (1 + impact)).clip(upper=0.99)
            df.loc[neg_mask, 'progno_score'] = (df.loc[neg_mask, 'progno_score'] * (1 - impact)).clip(lower=0.01)
            
            return df, f"✅ Trend momentum ({self.domain}): {pos_mask.sum()} bullish, {neg_mask.sum()} bearish"
        
        return df, f"⚠️ No trend column found for {self.domain}"
    
    def cmd_recency_decay(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Universal time decay - newer data weighted higher.
        
        Sports: Recent game performance
        Stocks: Recent price action
        Weather: Forecast freshness
        """
        decay_rate = self.config['time_decay_rate']
        
        # Find time column
        time_col = None
        for col in ['days_ago', 'hours_ago', 'age_days', 'data_age', 'forecast_age']:
            if col in df.columns:
                time_col = col
                break
        
        if not time_col and 'timestamp' in df.columns:
            # Calculate from timestamp
            try:
                df['_days_ago'] = (datetime.now() - pd.to_datetime(df['timestamp'])).dt.days
                time_col = '_days_ago'
            except:
                pass
        
        if not time_col:
            return df, f"⚠️ No time/age column found for {self.domain}"
        
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Exponential decay toward 0.5 (uncertainty)
        time_val = df[time_col].fillna(0).astype(float)
        decay_weight = np.exp(-decay_rate * time_val)
        
        df['progno_score'] = df['progno_score'] * decay_weight + 0.5 * (1 - decay_weight)
        df['time_weight'] = decay_weight
        
        avg_weight = decay_weight.mean()
        return df, f"✅ Recency decay ({self.domain}): avg weight {avg_weight:.3f}"
    
    def cmd_social_sentiment(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Universal sentiment - social/public opinion impact.
        
        Sports: Fan confidence
        Stocks: Options flow, analyst sentiment
        Crypto: Twitter/Reddit volume
        Politics: Polling data
        """
        weight = self.config['sentiment_weight']
        
        # Find sentiment column
        sent_col = None
        for col in ['sentiment', 'sentiment_score', 'social_score', 'public_pct', 
                    'put_call_ratio', 'bull_pct', 'approval_rating', 'poll_avg']:
            if col in df.columns:
                sent_col = col
                break
        
        if not sent_col:
            return df, f"⚠️ No sentiment column found for {self.domain}"
        
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Normalize sentiment to 0-1
        sentiment = df[sent_col].fillna(0.5).astype(float)
        if sentiment.min() < 0:  # -1 to 1 scale
            sentiment = (sentiment + 1) / 2
        elif sentiment.max() > 1:  # 0-100 scale
            sentiment = sentiment / 100
        
        # Adjust score
        adjustment = (sentiment - 0.5) * weight * 2
        df['progno_score'] = (df['progno_score'] + adjustment).clip(0.01, 0.99)
        
        avg_sent = sentiment.mean()
        return df, f"✅ Social sentiment ({self.domain}): avg {avg_sent:.2f}, ±{weight*100:.0f}% impact"
    
    def cmd_volatility_risk(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Universal volatility - flag uncertain/risky predictions.
        
        Sports: High variance games
        Stocks: High IV options
        Crypto: Volatile coins
        Weather: Uncertain forecasts
        """
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        # Remove non-feature columns
        exclude = ['progno_score', 'volatility_score', 'is_high_risk']
        feature_cols = [c for c in numeric_cols if c not in exclude]
        
        if not feature_cols:
            return df, "⚠️ No numeric columns for volatility calculation"
        
        # Calculate coefficient of variation
        row_std = df[feature_cols].std(axis=1)
        row_mean = df[feature_cols].mean(axis=1).replace(0, 0.001).abs()
        volatility = row_std / row_mean
        
        # Normalize volatility
        vol_min, vol_max = volatility.min(), volatility.max()
        if vol_max > vol_min:
            norm_vol = (volatility - vol_min) / (vol_max - vol_min)
        else:
            norm_vol = volatility * 0 + 0.5
        
        df['volatility_score'] = norm_vol
        df['is_high_risk'] = norm_vol > 0.7
        
        # Reduce confidence for high volatility predictions
        if 'progno_score' in df.columns:
            # Push toward 0.5 for volatile predictions
            uncertainty_factor = norm_vol * 0.3  # Max 30% pull toward 0.5
            df['progno_score'] = df['progno_score'] * (1 - uncertainty_factor) + 0.5 * uncertainty_factor
        
        high_risk = df['is_high_risk'].sum()
        return df, f"⚠️ Volatility analysis ({self.domain}): {high_risk} high-risk flagged"
    
    def cmd_resource_availability(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Universal "injury" command - resource/factor availability impact.
        
        Sports: Player injuries
        Stocks: Key executive availability
        Crypto: Protocol health
        Business: Resource constraints
        """
        # Find resource/availability column
        res_col = None
        for col in ['injury_severity', 'resource_score', 'availability', 
                    'protocol_risk', 'constraint_level', 'risk_factor']:
            if col in df.columns:
                res_col = col
                break
        
        if not res_col:
            return df, f"⚠️ No resource/availability column found for {self.domain}"
        
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Normalize to 0-1 (higher = more impact/worse)
        impact = df[res_col].fillna(0).astype(float)
        if impact.max() > 10:
            impact = impact / 100  # Assume percentage
        elif impact.max() > 1:
            impact = impact / impact.max()  # Normalize to max
        
        # Reduce probability based on resource impact
        reduction = impact * 0.15  # Max 15% reduction
        df['progno_score'] = (df['progno_score'] - reduction).clip(0.01, 0.99)
        
        affected = (impact > 0).sum()
        return df, f"✅ Resource impact ({self.domain}): {affected} affected"
    
    # ========================================
    # UNIVERSAL PROBABILITY CALCULATOR
    # ========================================
    
    def calculate_universal_score(self, row: pd.Series) -> float:
        """
        Calculate probability score using domain-appropriate weighting.
        """
        # Start with base probability
        base = row.get('base_probability', row.get('win_rate', row.get('prob', 0.5)))
        prob = float(base) if pd.notna(base) else 0.5
        
        config = self.config
        
        # Status quo bias
        if row.get('is_incumbent', row.get('is_home', row.get('is_current', False))):
            prob = min(prob * (1 + config['home_bias']), 0.99)
        
        # Momentum
        trend = row.get('trend', row.get('streak', row.get('momentum', 0)))
        if trend >= config['momentum_threshold']:
            prob = min(prob * (1 + config['momentum_impact']), 0.99)
        elif trend <= -config['momentum_threshold']:
            prob = max(prob * (1 - config['momentum_impact']), 0.01)
        
        # Time decay
        age = row.get('days_ago', row.get('age_days', 0))
        if age > 0:
            decay = np.exp(-config['time_decay_rate'] * age)
            prob = prob * decay + 0.5 * (1 - decay)
        
        # Sentiment
        sentiment = row.get('sentiment', row.get('sentiment_score', 0.5))
        if pd.notna(sentiment):
            sent_adj = (float(sentiment) - 0.5) * config['sentiment_weight'] * 2
            prob = np.clip(prob + sent_adj, 0.01, 0.99)
        
        # Resource/injury impact
        impact = row.get('injury_severity', row.get('risk_factor', 0))
        if impact > 0:
            prob = max(prob - float(impact) * 0.03, 0.01)
        
        return round(float(prob), 4)
    
    def get_available_domains(self) -> List[str]:
        """Return list of supported domains."""
        return list(self.DOMAIN_CONFIGS.keys())
    
    def get_domain_config(self, domain: str = None) -> Dict:
        """Get configuration for a domain."""
        domain = domain or self.domain
        return self.DOMAIN_CONFIGS.get(domain, {})


# ========================================
# PREDICTION MARKET SPECIFIC
# ========================================

class PredictionMarketCommands:
    """
    Specialized commands for prediction markets (Kalshi, Polymarket, etc.)
    """
    
    @staticmethod
    def cmd_deadline_urgency(df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Adjust probability based on time until resolution.
        Closer deadlines = less likely to change dramatically.
        """
        if 'days_until_resolution' not in df.columns:
            return df, "⚠️ Need 'days_until_resolution' column"
        
        days = df['days_until_resolution'].fillna(30).astype(float)
        
        # Less time = more certainty (push away from 0.5)
        certainty_factor = np.exp(-0.05 * days)  # 0 to 1
        
        if 'progno_score' in df.columns:
            # Push scores away from 0.5 as deadline approaches
            deviation = df['progno_score'] - 0.5
            df['progno_score'] = 0.5 + deviation * (1 + certainty_factor * 0.3)
            df['progno_score'] = df['progno_score'].clip(0.01, 0.99)
        
        return df, f"✅ Deadline urgency applied: closer events = higher certainty"
    
    @staticmethod
    def cmd_market_efficiency(df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Check market efficiency by comparing multiple sources.
        Large discrepancies = potential mispricing.
        """
        price_cols = [c for c in df.columns if 'price' in c.lower() or 'prob' in c.lower()]
        
        if len(price_cols) < 2:
            return df, "⚠️ Need at least 2 price/probability columns"
        
        # Calculate spread between sources
        prices = df[price_cols].astype(float)
        df['market_spread'] = prices.max(axis=1) - prices.min(axis=1)
        df['avg_market_price'] = prices.mean(axis=1)
        df['is_inefficient'] = df['market_spread'] > 0.05  # >5% spread
        
        inefficient = df['is_inefficient'].sum()
        return df, f"💡 Market efficiency: {inefficient} potentially mispriced events (>5% spread)"
    
    @staticmethod
    def cmd_cross_platform_arb(df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Find arbitrage between prediction market platforms.
        If Platform A says 60% YES and Platform B says 50% NO,
        you can profit by betting both.
        """
        # Need YES and NO columns from different platforms
        yes_cols = [c for c in df.columns if 'yes' in c.lower()]
        no_cols = [c for c in df.columns if 'no' in c.lower()]
        
        if not yes_cols or not no_cols:
            return df, "⚠️ Need YES and NO price columns (e.g., kalshi_yes, polymarket_no)"
        
        arb_opportunities = []
        
        for idx, row in df.iterrows():
            best_yes = max(row.get(c, 0) for c in yes_cols)
            best_no = max(row.get(c, 0) for c in no_cols)
            
            # Arbitrage if best_yes + best_no < 1
            if best_yes + best_no < 1:
                profit_pct = (1 - best_yes - best_no) * 100
                arb_opportunities.append({
                    'idx': idx,
                    'is_arb': True,
                    'profit_pct': profit_pct
                })
            else:
                arb_opportunities.append({
                    'idx': idx,
                    'is_arb': False,
                    'profit_pct': 0
                })
        
        df['is_prediction_arb'] = [a['is_arb'] for a in arb_opportunities]
        df['prediction_arb_profit'] = [a['profit_pct'] for a in arb_opportunities]
        
        arb_count = sum(a['is_arb'] for a in arb_opportunities)
        return df, f"💰 Found {arb_count} cross-platform arbitrage opportunities"


# ========================================
# STOCK/OPTIONS SPECIFIC
# ========================================

class OptionsCommands:
    """
    Specialized commands for stock options probability.
    """
    
    @staticmethod
    def cmd_implied_vol_adjust(df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Adjust probability based on implied volatility.
        High IV = wider probability distribution.
        """
        if 'implied_volatility' not in df.columns and 'iv' not in df.columns:
            return df, "⚠️ Need 'implied_volatility' or 'iv' column"
        
        iv_col = 'implied_volatility' if 'implied_volatility' in df.columns else 'iv'
        iv = df[iv_col].fillna(0.3).astype(float)  # Default 30% IV
        
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Higher IV = push toward 0.5 (more uncertainty)
        uncertainty = (iv - 0.3).clip(0, 1)  # Excess IV above 30%
        df['progno_score'] = df['progno_score'] * (1 - uncertainty * 0.3) + 0.5 * uncertainty * 0.3
        
        return df, f"✅ IV adjustment: avg IV = {iv.mean():.1%}"
    
    @staticmethod
    def cmd_delta_probability(df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Use option delta as probability proxy.
        Delta ≈ probability of finishing ITM.
        """
        if 'delta' not in df.columns:
            return df, "⚠️ Need 'delta' column"
        
        # Delta is already a probability (0 to 1)
        df['progno_score'] = df['delta'].fillna(0.5).clip(0.01, 0.99)
        
        return df, f"✅ Using delta as probability (avg: {df['progno_score'].mean():.2%})"


# Factory function
def get_universal_engine(domain: str = 'sports') -> UniversalPrognoEngine:
    """Get a domain-configured universal engine."""
    return UniversalPrognoEngine(domain)

