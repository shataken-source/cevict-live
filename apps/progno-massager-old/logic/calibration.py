"""
PROGNO Calibration & Learning System
=====================================
Tracks prediction outcomes, analyzes accuracy, and auto-adjusts weights.

Features:
- Prediction tracking with outcomes
- Accuracy analysis by domain
- Brier score calculation
- Auto weight adjustment
- Confidence calibration
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import numpy as np
from collections import defaultdict
import logging

logger = logging.getLogger("PROGNO_CALIBRATION")


class PredictionTracker:
    """
    Tracks all predictions and their outcomes for learning.
    """
    
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        self._local_cache: List[Dict] = []
    
    def record_prediction(self, 
                          event_id: str,
                          event_name: str,
                          domain: str,
                          progno_score: float,
                          predicted_outcome: str,
                          confidence_level: str,
                          factors_used: List[str],
                          metadata: Dict = None) -> str:
        """
        Record a new prediction for tracking.
        
        Returns:
            prediction_id for later outcome update
        """
        prediction_id = f"{domain}_{event_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        record = {
            "prediction_id": prediction_id,
            "event_id": event_id,
            "event_name": event_name,
            "domain": domain,
            "progno_score": progno_score,
            "predicted_outcome": predicted_outcome,
            "confidence_level": confidence_level,
            "factors_used": factors_used,
            "metadata": metadata or {},
            "created_at": datetime.now().isoformat(),
            "actual_outcome": None,
            "was_correct": None,
            "resolved_at": None
        }
        
        # Save to Supabase if available
        if self.supabase:
            try:
                self.supabase.table("progno_predictions").insert(record).execute()
                logger.info(f"Prediction recorded: {prediction_id}")
            except Exception as e:
                logger.error(f"Supabase error: {e}")
                self._local_cache.append(record)
        else:
            self._local_cache.append(record)
        
        return prediction_id
    
    def update_outcome(self,
                       prediction_id: str,
                       actual_outcome: str,
                       was_correct: bool) -> bool:
        """
        Update a prediction with its actual outcome.
        """
        update_data = {
            "actual_outcome": actual_outcome,
            "was_correct": was_correct,
            "resolved_at": datetime.now().isoformat()
        }
        
        if self.supabase:
            try:
                self.supabase.table("progno_predictions").update(
                    update_data
                ).eq("prediction_id", prediction_id).execute()
                logger.info(f"Outcome updated: {prediction_id} -> {was_correct}")
                return True
            except Exception as e:
                logger.error(f"Supabase error: {e}")
                return False
        else:
            # Update local cache
            for record in self._local_cache:
                if record["prediction_id"] == prediction_id:
                    record.update(update_data)
                    return True
            return False
    
    def get_predictions(self, 
                        domain: str = None,
                        resolved_only: bool = False,
                        days_back: int = 30) -> pd.DataFrame:
        """
        Get predictions from the tracker.
        """
        if self.supabase:
            try:
                query = self.supabase.table("progno_predictions").select("*")
                
                if domain:
                    query = query.eq("domain", domain)
                
                if resolved_only:
                    query = query.not_.is_("actual_outcome", "null")
                
                cutoff = (datetime.now() - timedelta(days=days_back)).isoformat()
                query = query.gte("created_at", cutoff)
                
                result = query.execute()
                return pd.DataFrame(result.data)
            except Exception as e:
                logger.error(f"Supabase error: {e}")
        
        # Fall back to local cache
        df = pd.DataFrame(self._local_cache)
        
        if domain and not df.empty:
            df = df[df['domain'] == domain]
        
        if resolved_only and not df.empty:
            df = df[df['actual_outcome'].notna()]
        
        return df


class AccuracyAnalyzer:
    """
    Analyzes prediction accuracy and calibration.
    """
    
    def __init__(self, tracker: PredictionTracker):
        self.tracker = tracker
    
    def calculate_accuracy(self, domain: str = None) -> Dict[str, float]:
        """
        Calculate overall accuracy metrics.
        """
        df = self.tracker.get_predictions(domain=domain, resolved_only=True)
        
        if df.empty:
            return {
                "total_predictions": 0,
                "accuracy": 0,
                "brier_score": 0,
                "calibration_error": 0
            }
        
        total = len(df)
        correct = df['was_correct'].sum()
        accuracy = correct / total if total > 0 else 0
        
        # Brier Score (lower is better, 0 is perfect)
        brier_score = self._calculate_brier_score(df)
        
        # Calibration Error
        calibration_error = self._calculate_calibration_error(df)
        
        return {
            "total_predictions": total,
            "correct_predictions": int(correct),
            "accuracy": round(accuracy, 4),
            "brier_score": round(brier_score, 4),
            "calibration_error": round(calibration_error, 4)
        }
    
    def _calculate_brier_score(self, df: pd.DataFrame) -> float:
        """
        Calculate Brier score - measures calibration of probability predictions.
        Perfect score = 0, worst = 1
        """
        if df.empty:
            return 0
        
        # Brier = mean((probability - outcome)^2)
        outcomes = df['was_correct'].astype(float).values
        probabilities = df['progno_score'].values
        
        brier = np.mean((probabilities - outcomes) ** 2)
        return float(brier)
    
    def _calculate_calibration_error(self, df: pd.DataFrame) -> float:
        """
        Calculate Expected Calibration Error (ECE).
        Measures how well probabilities match actual frequencies.
        """
        if len(df) < 10:
            return 0
        
        # Bin predictions by probability
        bins = np.linspace(0, 1, 11)  # 10 bins
        df['prob_bin'] = pd.cut(df['progno_score'], bins=bins)
        
        ece = 0
        for bin_label, group in df.groupby('prob_bin'):
            if len(group) == 0:
                continue
            
            # Average predicted probability in bin
            avg_prob = group['progno_score'].mean()
            
            # Actual frequency of success in bin
            actual_freq = group['was_correct'].mean()
            
            # Weight by bin size
            weight = len(group) / len(df)
            
            # Add to ECE
            ece += weight * abs(avg_prob - actual_freq)
        
        return float(ece)
    
    def accuracy_by_domain(self) -> Dict[str, Dict]:
        """
        Get accuracy breakdown by domain.
        """
        df = self.tracker.get_predictions(resolved_only=True)
        
        if df.empty:
            return {}
        
        results = {}
        for domain in df['domain'].unique():
            domain_df = df[df['domain'] == domain]
            
            results[domain] = {
                "total": len(domain_df),
                "correct": int(domain_df['was_correct'].sum()),
                "accuracy": round(domain_df['was_correct'].mean(), 4) if len(domain_df) > 0 else 0,
                "avg_confidence": round(domain_df['progno_score'].mean(), 4),
                "brier_score": round(self._calculate_brier_score(domain_df), 4)
            }
        
        return results
    
    def accuracy_by_confidence(self) -> Dict[str, Dict]:
        """
        Get accuracy breakdown by confidence level.
        """
        df = self.tracker.get_predictions(resolved_only=True)
        
        if df.empty:
            return {}
        
        # Create confidence bins
        bins = [(0, 0.55, "Low"), (0.55, 0.7, "Medium"), (0.7, 0.85, "High"), (0.85, 1.0, "Very High")]
        
        results = {}
        for low, high, label in bins:
            bin_df = df[(df['progno_score'] >= low) & (df['progno_score'] < high)]
            
            if len(bin_df) > 0:
                results[label] = {
                    "range": f"{low:.0%}-{high:.0%}",
                    "total": len(bin_df),
                    "correct": int(bin_df['was_correct'].sum()),
                    "accuracy": round(bin_df['was_correct'].mean(), 4),
                    "expected_accuracy": round((low + high) / 2, 4),
                    "calibration_gap": round(bin_df['was_correct'].mean() - (low + high) / 2, 4)
                }
        
        return results
    
    def get_calibration_report(self) -> Dict:
        """
        Generate comprehensive calibration report.
        """
        return {
            "overall": self.calculate_accuracy(),
            "by_domain": self.accuracy_by_domain(),
            "by_confidence": self.accuracy_by_confidence(),
            "generated_at": datetime.now().isoformat()
        }


class WeightOptimizer:
    """
    Automatically adjusts PROGNO weights based on historical performance.
    """
    
    # Default weights per domain
    DEFAULT_WEIGHTS = {
        "sports": {
            "home_bias": 0.05,
            "momentum_threshold": 3,
            "momentum_impact": 0.10,
            "time_decay_rate": 0.03,
            "sentiment_weight": 0.05
        },
        "prediction_markets": {
            "home_bias": 0.03,
            "momentum_threshold": 2,
            "momentum_impact": 0.08,
            "time_decay_rate": 0.01,
            "sentiment_weight": 0.15
        },
        "crypto": {
            "home_bias": 0.00,
            "momentum_threshold": 3,
            "momentum_impact": 0.15,
            "time_decay_rate": 0.10,
            "sentiment_weight": 0.20
        },
        "stocks": {
            "home_bias": 0.02,
            "momentum_threshold": 5,
            "momentum_impact": 0.05,
            "time_decay_rate": 0.05,
            "sentiment_weight": 0.10
        }
    }
    
    def __init__(self, tracker: PredictionTracker, supabase_client=None):
        self.tracker = tracker
        self.supabase = supabase_client
        self._current_weights: Dict[str, Dict] = {}
        self._load_weights()
    
    def _load_weights(self):
        """Load current weights from storage."""
        if self.supabase:
            try:
                result = self.supabase.table("progno_weights").select("*").execute()
                for row in result.data:
                    self._current_weights[row['domain']] = row['weights']
            except:
                pass
        
        # Fill in defaults
        for domain, defaults in self.DEFAULT_WEIGHTS.items():
            if domain not in self._current_weights:
                self._current_weights[domain] = defaults.copy()
    
    def get_weights(self, domain: str) -> Dict[str, float]:
        """Get current weights for a domain."""
        return self._current_weights.get(domain, self.DEFAULT_WEIGHTS.get(domain, {}))
    
    def optimize_weights(self, domain: str, min_samples: int = 50) -> Dict[str, Any]:
        """
        Optimize weights for a domain based on historical performance.
        
        Uses gradient-free optimization to find weights that minimize Brier score.
        """
        df = self.tracker.get_predictions(domain=domain, resolved_only=True)
        
        if len(df) < min_samples:
            return {
                "status": "insufficient_data",
                "samples": len(df),
                "required": min_samples,
                "weights": self.get_weights(domain)
            }
        
        current_weights = self.get_weights(domain)
        best_weights = current_weights.copy()
        best_score = self._evaluate_weights(df, current_weights)
        
        # Simple hill climbing optimization
        learning_rate = 0.01
        iterations = 100
        
        for _ in range(iterations):
            for param in best_weights.keys():
                # Try increasing
                test_weights = best_weights.copy()
                test_weights[param] = min(test_weights[param] + learning_rate, 1.0)
                score = self._evaluate_weights(df, test_weights)
                
                if score < best_score:
                    best_score = score
                    best_weights = test_weights.copy()
                    continue
                
                # Try decreasing
                test_weights = best_weights.copy()
                test_weights[param] = max(test_weights[param] - learning_rate, 0.0)
                score = self._evaluate_weights(df, test_weights)
                
                if score < best_score:
                    best_score = score
                    best_weights = test_weights.copy()
        
        # Save optimized weights
        self._current_weights[domain] = best_weights
        self._save_weights(domain, best_weights)
        
        return {
            "status": "optimized",
            "samples": len(df),
            "original_weights": current_weights,
            "optimized_weights": best_weights,
            "improvement": round((1 - best_score / self._evaluate_weights(df, current_weights)) * 100, 2)
        }
    
    def _evaluate_weights(self, df: pd.DataFrame, weights: Dict) -> float:
        """
        Evaluate weights using Brier score.
        Lower is better.
        """
        # Recalculate predictions with these weights
        recalculated_scores = []
        
        for _, row in df.iterrows():
            base_prob = 0.5
            
            # Apply weights (simplified)
            if weights.get('home_bias', 0) > 0:
                base_prob *= (1 + weights['home_bias'])
            
            # Momentum
            momentum = row.get('metadata', {}).get('momentum', 0)
            if momentum >= weights.get('momentum_threshold', 3):
                base_prob *= (1 + weights.get('momentum_impact', 0.1))
            
            # Clip
            recalculated_scores.append(np.clip(base_prob, 0.01, 0.99))
        
        # Calculate Brier score
        outcomes = df['was_correct'].astype(float).values
        brier = np.mean((np.array(recalculated_scores) - outcomes) ** 2)
        
        return float(brier)
    
    def _save_weights(self, domain: str, weights: Dict):
        """Save weights to storage."""
        if self.supabase:
            try:
                self.supabase.table("progno_weights").upsert({
                    "domain": domain,
                    "weights": weights,
                    "updated_at": datetime.now().isoformat()
                }).execute()
            except Exception as e:
                logger.error(f"Failed to save weights: {e}")


class ConfidenceCalibrator:
    """
    Calibrates confidence levels based on historical accuracy.
    """
    
    def __init__(self, analyzer: AccuracyAnalyzer):
        self.analyzer = analyzer
        self._calibration_map: Dict[str, Dict] = {}
    
    def calibrate(self, raw_score: float, domain: str = None) -> Tuple[float, str]:
        """
        Calibrate a raw PROGNO score based on historical performance.
        
        Returns:
            Tuple of (calibrated_score, confidence_label)
        """
        # Get historical calibration data
        by_confidence = self.analyzer.accuracy_by_confidence()
        
        if not by_confidence:
            # No historical data - return raw
            return raw_score, self._get_label(raw_score)
        
        # Find the bin this score falls into
        if raw_score < 0.55:
            bin_data = by_confidence.get("Low", {})
        elif raw_score < 0.70:
            bin_data = by_confidence.get("Medium", {})
        elif raw_score < 0.85:
            bin_data = by_confidence.get("High", {})
        else:
            bin_data = by_confidence.get("Very High", {})
        
        # Adjust score based on historical accuracy in this bin
        if bin_data:
            historical_accuracy = bin_data.get("accuracy", raw_score)
            calibration_gap = bin_data.get("calibration_gap", 0)
            
            # If we're overconfident, reduce score
            # If we're underconfident, increase score
            calibrated = raw_score - calibration_gap
            calibrated = np.clip(calibrated, 0.01, 0.99)
        else:
            calibrated = raw_score
        
        return round(float(calibrated), 4), self._get_label(calibrated)
    
    def _get_label(self, score: float) -> str:
        """Get confidence label for a score."""
        if score < 0.35:
            return "Strong Against"
        elif score < 0.45:
            return "Lean Against"
        elif score < 0.55:
            return "Toss-up"
        elif score < 0.65:
            return "Lean Towards"
        elif score < 0.75:
            return "Confident"
        elif score < 0.85:
            return "High Confidence"
        else:
            return "Very High Confidence"
    
    def get_reliability_score(self, domain: str = None) -> float:
        """
        Get overall reliability score for predictions.
        Based on historical Brier score.
        """
        accuracy = self.analyzer.calculate_accuracy(domain)
        brier = accuracy.get("brier_score", 0.25)
        
        # Convert Brier to reliability (0.25 Brier = 50% reliable, 0 = 100%)
        reliability = 1 - (brier * 4)  # Scale so 0.25 Brier = 0 reliability
        return max(0, min(1, reliability))


# Factory functions
def get_tracker(supabase_client=None) -> PredictionTracker:
    """Get prediction tracker instance."""
    return PredictionTracker(supabase_client)

def get_analyzer(tracker: PredictionTracker) -> AccuracyAnalyzer:
    """Get accuracy analyzer instance."""
    return AccuracyAnalyzer(tracker)

def get_optimizer(tracker: PredictionTracker, supabase_client=None) -> WeightOptimizer:
    """Get weight optimizer instance."""
    return WeightOptimizer(tracker, supabase_client)

def get_calibrator(analyzer: AccuracyAnalyzer) -> ConfidenceCalibrator:
    """Get confidence calibrator instance."""
    return ConfidenceCalibrator(analyzer)

