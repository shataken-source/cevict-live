"""
PROGNO Engine - Complete Implementation
========================================
Contains all 11 Massager Commands plus probability calculation logic.

Commands:
1. Trim Noise
2. Home Bias  
3. Volatility Filter
4. Time-Decay
5. Cevict Flex Squeeze
6. Momentum Bonus
7. Injury Leveler
8. Sentiment Infusion
9. Arbitrage Finder
10. Hedge Calculator
11. JSON Export
"""
import pandas as pd
import numpy as np
import json
from typing import Tuple, List, Dict, Any, Optional
from datetime import datetime

from .arbitrage import ArbitrageCalculator
from .supervisor import SupervisorAgent


class PrognoEngine:
    """
    The complete PROGNO engine with all 11 massager commands
    and probability calculation logic.
    """
    
    # Default weights for Cevict Flex model
    WEIGHTS = {
        'win_rate': 0.35,
        'recent_form': 0.20,
        'home_advantage': 0.15,
        'momentum': 0.10,
        'injury_factor': 0.10,
        'sentiment': 0.10
    }
    
    def __init__(self):
        self.arb_calculator = ArbitrageCalculator()
        self.supervisor = SupervisorAgent()
        self.command_log: List[Dict] = []
    
    # ========================================
    # THE 11 MASSAGER COMMANDS
    # ========================================
    
    def execute_command(self, df: pd.DataFrame, command: str, 
                        **kwargs) -> Tuple[pd.DataFrame, str]:
        """
        Execute a named command on the dataframe.
        
        Returns:
            Tuple of (modified dataframe, status message)
        """
        command_map = {
            # Cleaning Commands
            "Trim Noise": self.cmd_trim_noise,
            "Remove Duplicates": self.cmd_remove_duplicates,
            "Fill Missing Values": self.cmd_fill_missing,
            
            # Statistical Adjustments
            "Home Field Bias (+5%)": self.cmd_home_bias,
            "Volatility Filter": self.cmd_volatility_filter,
            "Time-Decay Weighting": self.cmd_time_decay,
            "Cevict Flex Squeeze (Normalize)": self.cmd_normalize,
            "Momentum Bonus (+10%)": self.cmd_momentum,
            "Injury Leveler": self.cmd_injury_leveler,
            "Sentiment Infusion": self.cmd_sentiment,
            
            # Calculation Commands
            "Calculate PROGNO Score": self.cmd_calculate_scores,
            "Arbitrage Finder": lambda df: self.cmd_arbitrage_finder(df, **kwargs),
            "Hedge Calculator": lambda df: self.cmd_hedge_calculator(df, **kwargs),
            
            # Export Commands
            "JSON Export": self.cmd_json_export,
        }
        
        func = command_map.get(command)
        if func:
            result_df, message = func(df)
            
            # Log command execution
            self.command_log.append({
                'command': command,
                'timestamp': datetime.now().isoformat(),
                'rows_affected': len(df),
                'message': message
            })
            
            return result_df, message
        
        return df, f"❓ Unknown command: {command}"
    
    # ========================================
    # COMMAND 1: TRIM NOISE
    # ========================================
    
    def cmd_trim_noise(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Strip whitespace, special characters, and standardize formatting.
        """
        changes = 0
        
        # Clean text columns
        for col in df.select_dtypes(include=['object']).columns:
            original = df[col].copy()
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].str.replace(r'[^\w\s\-\.\,]', '', regex=True)
            changes += (original != df[col]).sum()
        
        # Standardize column names
        original_cols = list(df.columns)
        df.columns = [c.lower().strip().replace(' ', '_').replace('-', '_') for c in df.columns]
        col_changes = sum(1 for o, n in zip(original_cols, df.columns) if o != n)
        
        return df, f"✅ Trimmed noise: {changes} cells cleaned, {col_changes} columns renamed"
    
    # ========================================
    # COMMAND 2: HOME FIELD BIAS
    # ========================================
    
    def cmd_home_bias(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Apply +5% probability boost for home teams.
        """
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        affected = 0
        if 'is_home' in df.columns:
            mask = df['is_home'].astype(bool)
            df.loc[mask, 'progno_score'] = (df.loc[mask, 'progno_score'] * 1.05).clip(upper=0.99)
            affected = mask.sum()
        else:
            # Assume all rows are home games if no column specified
            df['progno_score'] = (df['progno_score'] * 1.05).clip(upper=0.99)
            affected = len(df)
        
        return df, f"✅ Home field bias applied to {affected} rows (+5%)"
    
    # ========================================
    # COMMAND 3: VOLATILITY FILTER
    # ========================================
    
    def cmd_volatility_filter(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Flag high-volatility (risky) predictions based on statistical variance.
        """
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        if len(numeric_cols) == 0:
            return df, "⚠️ No numeric columns found for volatility calculation"
        
        # Calculate coefficient of variation for each row
        row_std = df[numeric_cols].std(axis=1)
        row_mean = df[numeric_cols].mean(axis=1).replace(0, 0.001)
        volatility = row_std / row_mean
        
        df['volatility_score'] = volatility
        df['is_high_risk'] = volatility > volatility.quantile(0.8)
        
        high_risk_count = df['is_high_risk'].sum()
        avg_volatility = volatility.mean()
        
        return df, f"⚠️ Flagged {high_risk_count} high-risk rows (avg volatility: {avg_volatility:.3f})"
    
    # ========================================
    # COMMAND 4: TIME-DECAY WEIGHTING
    # ========================================
    
    def cmd_time_decay(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Weight recent data higher than older data using exponential decay.
        """
        if 'days_ago' not in df.columns:
            return df, "⚠️ No 'days_ago' column found - add days since last game"
        
        # Exponential decay: more recent = higher weight
        df['time_weight'] = np.exp(-0.03 * df['days_ago'].fillna(0).astype(float))
        
        if 'progno_score' in df.columns:
            # Adjust score toward 0.5 based on age (regress to mean)
            df['progno_score'] = (
                df['progno_score'] * df['time_weight'] + 
                0.5 * (1 - df['time_weight'])
            )
        
        avg_weight = df['time_weight'].mean()
        return df, f"✅ Time-decay applied (avg weight: {avg_weight:.3f})"
    
    # ========================================
    # COMMAND 5: CEVICT FLEX SQUEEZE (NORMALIZE)
    # ========================================
    
    def cmd_normalize(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Normalize all probability scores to 0.01-0.99 range.
        """
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
            return df, "✅ Created progno_score column with default 0.5"
        
        score_min = df['progno_score'].min()
        score_max = df['progno_score'].max()
        
        if score_max > score_min:
            df['progno_score'] = (df['progno_score'] - score_min) / (score_max - score_min)
            df['progno_score'] = df['progno_score'].clip(0.01, 0.99)
        else:
            df['progno_score'] = 0.5
        
        return df, f"✅ Normalized scores (was {score_min:.3f}-{score_max:.3f}, now 0.01-0.99)"
    
    # ========================================
    # COMMAND 6: MOMENTUM BONUS
    # ========================================
    
    def cmd_momentum(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Apply +10% bonus for 3+ win streaks, -10% for 3+ loss streaks.
        """
        if 'streak' not in df.columns:
            return df, "⚠️ No 'streak' column found (positive=wins, negative=losses)"
        
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Hot streak bonus
        hot_mask = df['streak'].fillna(0).astype(int) >= 3
        cold_mask = df['streak'].fillna(0).astype(int) <= -3
        
        df.loc[hot_mask, 'progno_score'] = (df.loc[hot_mask, 'progno_score'] * 1.10).clip(upper=0.99)
        df.loc[cold_mask, 'progno_score'] = (df.loc[cold_mask, 'progno_score'] * 0.90).clip(lower=0.01)
        
        return df, f"✅ Momentum: {hot_mask.sum()} hot (+10%), {cold_mask.sum()} cold (-10%)"
    
    # ========================================
    # COMMAND 7: INJURY LEVELER
    # ========================================
    
    def cmd_injury_leveler(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Reduce probability based on injury severity (0-5 scale).
        """
        # Find injury column
        injury_col = None
        for col in ['injury_severity', 'injuries', 'injury_impact', 'injury_score']:
            if col in df.columns:
                injury_col = col
                break
        
        if not injury_col:
            return df, "⚠️ No injury column found (try: injury_severity, injuries)"
        
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Deduct 3% per severity point
        penalty = df[injury_col].fillna(0).astype(float) * 0.03
        df['progno_score'] = (df['progno_score'] - penalty).clip(lower=0.01)
        
        affected = (df[injury_col] > 0).sum()
        return df, f"✅ Injury impact: {affected} rows adjusted (-3% per severity point)"
    
    # ========================================
    # COMMAND 8: SENTIMENT INFUSION
    # ========================================
    
    def cmd_sentiment(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Adjust scores based on sentiment/hype (-1 to 1 or 0 to 1 scale).
        """
        # Find sentiment column
        sentiment_col = None
        for col in ['sentiment_score', 'sentiment', 'hype', 'buzz', 'public_pct']:
            if col in df.columns:
                sentiment_col = col
                break
        
        if not sentiment_col:
            return df, "⚠️ No sentiment column found (try: sentiment_score, hype)"
        
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Normalize sentiment to 0-1 if needed
        sentiment = df[sentiment_col].fillna(0.5).astype(float)
        if sentiment.min() < 0:  # -1 to 1 scale
            sentiment = (sentiment + 1) / 2
        
        # Adjust by up to ±5%
        adjustment = (sentiment - 0.5) * 0.1
        df['progno_score'] = (df['progno_score'] + adjustment).clip(0.01, 0.99)
        
        avg_sentiment = sentiment.mean()
        return df, f"✅ Sentiment infused (avg: {avg_sentiment:.2f}, ±5% adjustment)"
    
    # ========================================
    # COMMAND 9: ARBITRAGE FINDER
    # ========================================
    
    def cmd_arbitrage_finder(self, df: pd.DataFrame, 
                             odds_col_1: str = None,
                             odds_col_2: str = None,
                             bankroll: float = 1000) -> Tuple[pd.DataFrame, str]:
        """
        Scan dataset for arbitrage opportunities.
        """
        # Find odds columns
        odds_cols = [c for c in df.columns if 'odds' in c.lower()]
        
        if len(odds_cols) < 2:
            return df, "⚠️ Need at least 2 odds columns (e.g., home_odds, away_odds)"
        
        col1 = odds_col_1 or odds_cols[0]
        col2 = odds_col_2 or odds_cols[1]
        
        arb_results = []
        arb_count = 0
        
        for idx, row in df.iterrows():
            try:
                o1 = float(row[col1])
                o2 = float(row[col2])
                
                if o1 > 1 and o2 > 1:
                    result = self.arb_calculator.find_arbitrage([o1, o2], bankroll)
                    
                    # Validate with Supervisor
                    validation = self.supervisor.validate_arbitrage([o1, o2], result)
                    
                    arb_results.append({
                        'idx': idx,
                        'is_arb': result['is_arb'] and validation.is_valid,
                        'profit_pct': result.get('profit_pct', 0) if validation.is_valid else 0,
                        'validation_confidence': validation.confidence
                    })
                    
                    if result['is_arb'] and validation.is_valid:
                        arb_count += 1
            except (ValueError, TypeError):
                arb_results.append({'idx': idx, 'is_arb': False, 'profit_pct': 0})
        
        # Add arb columns
        df['is_arb_opportunity'] = [r['is_arb'] for r in arb_results]
        df['arb_profit_pct'] = [r['profit_pct'] for r in arb_results]
        
        return df, f"💰 Found {arb_count} arbitrage opportunities (validated by Supervisor)"
    
    # ========================================
    # COMMAND 10: HEDGE CALCULATOR
    # ========================================
    
    def cmd_hedge_calculator(self, df: pd.DataFrame,
                             stake_col: str = None,
                             original_odds_col: str = None,
                             hedge_odds_col: str = None) -> Tuple[pd.DataFrame, str]:
        """
        Calculate hedge bets for existing positions.
        """
        # Try to find relevant columns
        stake_col = stake_col or 'original_stake'
        original_odds_col = original_odds_col or 'original_odds'
        hedge_odds_col = hedge_odds_col or 'hedge_odds'
        
        required = [stake_col, original_odds_col, hedge_odds_col]
        missing = [c for c in required if c not in df.columns]
        
        if missing:
            return df, f"⚠️ Missing columns: {missing}. Need stake, original_odds, hedge_odds"
        
        hedge_stakes = []
        guaranteed_profits = []
        
        for idx, row in df.iterrows():
            try:
                stake = float(row[stake_col])
                orig_odds = float(row[original_odds_col])
                hedge_odds = float(row[hedge_odds_col])
                
                result = self.arb_calculator.calculate_hedge(stake, orig_odds, hedge_odds)
                
                # Validate with Supervisor
                validation = self.supervisor.validate_hedge(
                    stake, orig_odds, hedge_odds, result
                )
                
                if validation.is_valid:
                    hedge_stakes.append(result['hedge_stake'])
                    guaranteed_profits.append(result['guaranteed_profit'])
                else:
                    hedge_stakes.append(0)
                    guaranteed_profits.append(0)
            except (ValueError, TypeError):
                hedge_stakes.append(0)
                guaranteed_profits.append(0)
        
        df['recommended_hedge_stake'] = hedge_stakes
        df['guaranteed_profit'] = guaranteed_profits
        
        total_profit = sum(guaranteed_profits)
        return df, f"🛡️ Hedge calculated: ${total_profit:.2f} total guaranteed profit"
    
    # ========================================
    # COMMAND 11: JSON EXPORT
    # ========================================
    
    def cmd_json_export(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Prepare data for JSON export (web-ready format).
        """
        # Add export metadata
        df['export_timestamp'] = datetime.now().isoformat()
        df['export_format'] = 'web_ready'
        
        # Ensure key columns exist
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Add confidence label
        df['confidence_label'] = pd.cut(
            df['progno_score'],
            bins=[0, 0.3, 0.45, 0.55, 0.7, 1.0],
            labels=['Strong Away', 'Lean Away', 'Toss-up', 'Lean Home', 'Strong Home']
        )
        
        # Generate JSON-ready structure
        records = df.to_dict(orient='records')
        
        return df, f"📄 JSON export ready: {len(records)} records prepared"
    
    # ========================================
    # ADDITIONAL COMMANDS
    # ========================================
    
    def cmd_remove_duplicates(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """Remove duplicate rows."""
        original_len = len(df)
        df = df.drop_duplicates()
        removed = original_len - len(df)
        return df, f"✅ Removed {removed} duplicate rows"
    
    def cmd_fill_missing(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """Fill missing values intelligently."""
        filled = 0
        
        for col in df.columns:
            missing = df[col].isna().sum()
            if missing > 0:
                if df[col].dtype in ['float64', 'int64']:
                    df[col] = df[col].fillna(df[col].median())
                else:
                    df[col] = df[col].fillna('Unknown')
                filled += missing
        
        return df, f"✅ Filled {filled} missing values"
    
    def cmd_calculate_scores(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """Calculate full PROGNO probability scores."""
        scores = []
        
        for _, row in df.iterrows():
            score = self.calculate_progno_score(row, model="cevict_flex")
            scores.append(score)
        
        df['progno_score'] = scores
        
        # Add confidence rating
        df['confidence'] = pd.cut(
            df['progno_score'],
            bins=[0, 0.3, 0.45, 0.55, 0.7, 1.0],
            labels=['Strong Away', 'Lean Away', 'Toss-up', 'Lean Home', 'Strong Home']
        )
        
        avg_score = df['progno_score'].mean()
        return df, f"✅ PROGNO scores calculated (avg: {avg_score:.3f})"
    
    # ========================================
    # PROBABILITY CALCULATION
    # ========================================
    
    @staticmethod
    def calculate_progno_score(row: pd.Series, model: str = "cevict_flex") -> float:
        """
        Calculate the full PROGNO probability score.
        """
        # Start with base probability from win rate
        win_rate = row.get('win_rate', row.get('home_win_rate', 0.5))
        prob = float(win_rate) if pd.notna(win_rate) else 0.5
        
        if model == "cevict_flex":
            # Home advantage
            if row.get('is_home', False):
                prob = min(prob * 1.05, 0.99)
            
            # Momentum
            streak = int(row.get('streak', 0))
            if streak >= 3:
                prob = min(prob + streak * 0.02, 0.99)
            elif streak <= -3:
                prob = max(prob + streak * 0.02, 0.01)
            
            # Time decay
            days_ago = int(row.get('days_ago', 0))
            if days_ago > 0:
                decay = np.exp(-0.03 * days_ago)
                prob = prob * decay + 0.5 * (1 - decay)
            
            # Injury impact
            injury = int(row.get('injury_severity', 0))
            if injury > 0:
                prob = max(prob - injury * 0.03, 0.01)
            
            # Sentiment
            sentiment = float(row.get('sentiment_score', 0.5))
            adjustment = (sentiment - 0.5) * 0.1
            prob = np.clip(prob + adjustment, 0.01, 0.99)
        
        return round(float(prob), 4)
    
    # ========================================
    # UTILITY METHODS
    # ========================================
    
    def get_available_commands(self) -> List[str]:
        """Return list of all available commands."""
        return [
            "Trim Noise",
            "Home Field Bias (+5%)",
            "Volatility Filter",
            "Time-Decay Weighting",
            "Cevict Flex Squeeze (Normalize)",
            "Momentum Bonus (+10%)",
            "Injury Leveler",
            "Sentiment Infusion",
            "Calculate PROGNO Score",
            "Arbitrage Finder",
            "Hedge Calculator",
            "JSON Export",
            "Remove Duplicates",
            "Fill Missing Values"
        ]
    
    def get_command_log(self) -> List[Dict]:
        """Get history of executed commands."""
        return self.command_log
    
    def export_to_json(self, df: pd.DataFrame, filename: str = None) -> str:
        """Export dataframe to JSON string."""
        return df.to_json(orient='records', indent=2)
    
    def export_to_web_format(self, df: pd.DataFrame) -> List[Dict]:
        """Export to web-ready format for Prognostication.com"""
        required_cols = ['event', 'progno_score', 'confidence']
        
        records = []
        for _, row in df.iterrows():
            record = {
                'event': row.get('event', row.get('name', 'Unknown')),
                'progno_score': float(row.get('progno_score', 0.5)),
                'confidence': str(row.get('confidence', 'Unknown')),
                'is_high_risk': bool(row.get('is_high_risk', False)),
                'timestamp': datetime.now().isoformat()
            }
            
            # Add optional arb data
            if row.get('is_arb_opportunity'):
                record['arb_opportunity'] = {
                    'is_arb': True,
                    'profit_pct': float(row.get('arb_profit_pct', 0))
                }
            
            records.append(record)
        
        return records
