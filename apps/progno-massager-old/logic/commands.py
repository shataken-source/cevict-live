"""
PROGNO Data Commands
====================
11 built-in commands for massaging sports data.
"""
import pandas as pd
import numpy as np
from typing import Tuple
from .engine import PrognoEngine


class DataCommands:
    """
    The 11 core data manipulation commands for PROGNO.
    """
    
    def __init__(self):
        self.engine = PrognoEngine()
    
    def execute_command(self, df: pd.DataFrame, command: str) -> Tuple[pd.DataFrame, str]:
        """
        Execute a named command on the dataframe.
        
        Returns:
            Tuple of (modified dataframe, status message)
        """
        command_map = {
            "Trim Noise": self.trim_noise,
            "Home Field Bias (+5%)": self.apply_home_bias,
            "Volatility Filter": self.apply_volatility_filter,
            "Time-Decay Weighting": self.apply_time_decay,
            "Cevict Flex Squeeze (Normalize)": self.normalize_scores,
            "Momentum Bonus (+10%)": self.apply_momentum,
            "Injury Leveler": self.apply_injury_leveler,
            "Sentiment Infusion": self.apply_sentiment,
            "Calculate PROGNO Score": self.calculate_scores,
            "Remove Duplicates": self.remove_duplicates,
            "Fill Missing Values": self.fill_missing,
        }
        
        func = command_map.get(command)
        if func:
            return func(df)
        
        return df, f"❓ Unknown command: {command}"
    
    def trim_noise(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Command 1: Strip whitespace and special characters from text columns.
        """
        for col in df.select_dtypes(include=['object']).columns:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].str.replace(r'[^\w\s\-\.]', '', regex=True)
        
        # Standardize column names
        df.columns = [c.lower().strip().replace(' ', '_').replace('-', '_') for c in df.columns]
        
        return df, "✅ Noise trimmed from all text fields"
    
    def apply_home_bias(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Command 2: Apply +5% probability boost for home teams.
        """
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        if 'is_home' in df.columns:
            mask = df['is_home'].astype(bool)
            df.loc[mask, 'progno_score'] = (df.loc[mask, 'progno_score'] * 1.05).clip(upper=0.99)
            affected = mask.sum()
        else:
            # Assume first team listed is home
            df['progno_score'] = df['progno_score'] * 1.05
            df['progno_score'] = df['progno_score'].clip(upper=0.99)
            affected = len(df)
        
        return df, f"✅ Home field bias applied to {affected} rows (+5%)"
    
    def apply_volatility_filter(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Command 3: Flag high-volatility (risky) predictions.
        """
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        if len(numeric_cols) > 0:
            # Calculate row-wise coefficient of variation
            row_std = df[numeric_cols].std(axis=1)
            row_mean = df[numeric_cols].mean(axis=1).replace(0, 0.001)
            volatility = row_std / row_mean
            
            df['volatility_score'] = volatility
            df['is_high_risk'] = volatility > volatility.quantile(0.8)
            
            high_risk_count = df['is_high_risk'].sum()
            return df, f"⚠️ Flagged {high_risk_count} high-risk rows (top 20% volatility)"
        
        return df, "⚠️ No numeric columns found for volatility calculation"
    
    def apply_time_decay(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Command 4: Weight recent data higher than older data.
        """
        if 'days_ago' not in df.columns:
            return df, "⚠️ No 'days_ago' column found"
        
        # Exponential decay: more recent = higher weight
        df['time_weight'] = np.exp(-0.03 * df['days_ago'].fillna(0))
        
        if 'progno_score' in df.columns:
            # Adjust score toward 0.5 based on age
            df['progno_score'] = df['progno_score'] * df['time_weight'] + 0.5 * (1 - df['time_weight'])
        
        return df, "✅ Time-decay weighting applied (recent data weighted higher)"
    
    def normalize_scores(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Command 5: Normalize all probability scores to 0.0-1.0 range.
        """
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
            return df, "✅ Created progno_score column with default 0.5"
        
        score_min = df['progno_score'].min()
        score_max = df['progno_score'].max()
        
        if score_max > score_min:
            df['progno_score'] = (df['progno_score'] - score_min) / (score_max - score_min)
            df['progno_score'] = df['progno_score'].clip(0.01, 0.99)
        
        return df, f"✅ Scores normalized (was {score_min:.2f}-{score_max:.2f}, now 0.01-0.99)"
    
    def apply_momentum(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Command 6: Apply +10% bonus for teams on 3+ win streaks.
        """
        if 'streak' not in df.columns:
            return df, "⚠️ No 'streak' column found"
        
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Positive streak = winning, negative = losing
        hot_mask = df['streak'] >= 3
        cold_mask = df['streak'] <= -3
        
        df.loc[hot_mask, 'progno_score'] = (df.loc[hot_mask, 'progno_score'] * 1.10).clip(upper=0.99)
        df.loc[cold_mask, 'progno_score'] = (df.loc[cold_mask, 'progno_score'] * 0.90).clip(lower=0.01)
        
        hot_count = hot_mask.sum()
        cold_count = cold_mask.sum()
        
        return df, f"✅ Momentum applied: {hot_count} hot streaks (+10%), {cold_count} cold streaks (-10%)"
    
    def apply_injury_leveler(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Command 7: Reduce probability based on injury severity.
        """
        injury_col = None
        for col in ['injury_severity', 'injuries', 'injury_impact', 'injury_score']:
            if col in df.columns:
                injury_col = col
                break
        
        if not injury_col:
            return df, "⚠️ No injury column found (try: injury_severity, injuries, injury_impact)"
        
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Deduct 3% per severity point (0-5 scale)
        penalty = df[injury_col].fillna(0) * 0.03
        df['progno_score'] = (df['progno_score'] - penalty).clip(lower=0.01)
        
        affected = (df[injury_col] > 0).sum()
        return df, f"✅ Injury impact applied to {affected} rows (-3% per severity point)"
    
    def apply_sentiment(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Command 8: Adjust scores based on sentiment/hype.
        """
        sentiment_col = None
        for col in ['sentiment_score', 'sentiment', 'hype', 'buzz']:
            if col in df.columns:
                sentiment_col = col
                break
        
        if not sentiment_col:
            return df, "⚠️ No sentiment column found (try: sentiment_score, sentiment, hype)"
        
        if 'progno_score' not in df.columns:
            df['progno_score'] = 0.5
        
        # Sentiment 0-1 scale, 0.5 is neutral
        # Adjust score by up to ±5%
        adjustment = (df[sentiment_col].fillna(0.5) - 0.5) * 0.1
        df['progno_score'] = (df['progno_score'] + adjustment).clip(0.01, 0.99)
        
        return df, f"✅ Sentiment infusion applied (±5% based on {sentiment_col})"
    
    def calculate_scores(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Command 9: Calculate full PROGNO probability scores.
        """
        scores = []
        
        for _, row in df.iterrows():
            score = self.engine.calculate_progno_score(row, model="cevict_flex")
            scores.append(score)
        
        df['progno_score'] = scores
        
        # Add confidence rating
        df['confidence'] = pd.cut(
            df['progno_score'],
            bins=[0, 0.3, 0.45, 0.55, 0.7, 1.0],
            labels=['Strong Away', 'Lean Away', 'Toss-up', 'Lean Home', 'Strong Home']
        )
        
        avg_score = df['progno_score'].mean()
        return df, f"✅ PROGNO scores calculated (avg: {avg_score:.2f})"
    
    def remove_duplicates(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Command 10: Remove duplicate rows.
        """
        original_len = len(df)
        df = df.drop_duplicates()
        removed = original_len - len(df)
        
        return df, f"✅ Removed {removed} duplicate rows"
    
    def fill_missing(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """
        Command 11: Fill missing values intelligently.
        """
        filled = 0
        
        for col in df.columns:
            missing = df[col].isna().sum()
            if missing > 0:
                if df[col].dtype in ['float64', 'int64']:
                    df[col] = df[col].fillna(df[col].median())
                else:
                    df[col] = df[col].fillna('Unknown')
                filled += missing
        
        return df, f"✅ Filled {filled} missing values (median for numbers, 'Unknown' for text)"
    
    # Utility methods
    def get_available_commands(self) -> list:
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
            "Remove Duplicates",
            "Fill Missing Values"
        ]
    
    def get_command_help(self, command: str) -> str:
        """Get help text for a specific command."""
        help_text = {
            "Trim Noise": "Removes whitespace, special characters, and standardizes column names.",
            "Home Field Bias (+5%)": "Boosts probability by 5% for home teams.",
            "Volatility Filter": "Flags rows with high statistical variance as 'high risk'.",
            "Time-Decay Weighting": "Weights recent results higher than older ones.",
            "Cevict Flex Squeeze (Normalize)": "Normalizes all scores to 0.0-1.0 range.",
            "Momentum Bonus (+10%)": "Adds 10% to teams on 3+ win streaks, -10% for losing streaks.",
            "Injury Leveler": "Reduces probability based on injury severity (3% per point).",
            "Sentiment Infusion": "Adjusts scores based on public sentiment/hype.",
            "Calculate PROGNO Score": "Runs the full Cevict Flex probability model.",
            "Remove Duplicates": "Removes exact duplicate rows from the dataset.",
            "Fill Missing Values": "Fills NA values with median (numbers) or 'Unknown' (text)."
        }
        return help_text.get(command, "No help available.")

