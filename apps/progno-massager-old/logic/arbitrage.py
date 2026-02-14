"""
PROGNO Arbitrage & Hedge Calculator
====================================
Finds risk-free profit opportunities and calculates perfect hedge bets.
"""
from typing import List, Dict, Optional
import numpy as np


class ArbitrageCalculator:
    """
    Dummy-proof arbitrage and hedge calculation engine.
    """
    
    @staticmethod
    def implied_probability(decimal_odds: float) -> float:
        """
        Convert decimal odds to implied probability.
        
        Example: 2.00 odds = 50% implied probability
        """
        if decimal_odds <= 1:
            return 1.0
        return 1 / decimal_odds
    
    @staticmethod
    def american_to_decimal(american_odds: int) -> float:
        """
        Convert American odds to decimal odds.
        
        Example: +150 = 2.50, -150 = 1.67
        """
        if american_odds > 0:
            return (american_odds / 100) + 1
        else:
            return (100 / abs(american_odds)) + 1
    
    @staticmethod
    def decimal_to_american(decimal_odds: float) -> int:
        """
        Convert decimal odds to American odds.
        """
        if decimal_odds >= 2.0:
            return int((decimal_odds - 1) * 100)
        else:
            return int(-100 / (decimal_odds - 1))
    
    def find_arbitrage(self, odds_list: List[float], bankroll: float = 1000) -> Dict:
        """
        Check if arbitrage opportunity exists between multiple outcomes.
        
        Args:
            odds_list: List of decimal odds for each outcome (e.g., [2.10, 2.05])
            bankroll: Total amount to spread across bets
            
        Returns:
            Dictionary with arbitrage details or None if no arb exists
        """
        # Calculate implied probabilities
        implied_probs = [self.implied_probability(o) for o in odds_list]
        total_prob = sum(implied_probs)
        
        # Calculate house margin (overround)
        margin = (total_prob - 1) * 100
        
        # Arbitrage exists if total probability < 100%
        is_arb = total_prob < 1.0
        
        if not is_arb:
            return {
                'is_arb': False,
                'total_prob': round(total_prob * 100, 2),
                'margin': round(margin, 2),
                'profit_pct': 0,
                'profit_amount': 0,
                'stakes': []
            }
        
        # Calculate optimal stakes for each outcome
        stakes = [(bankroll * p) / total_prob for p in implied_probs]
        
        # Calculate guaranteed profit
        # All outcomes return the same amount
        total_return = bankroll / total_prob
        profit = total_return - bankroll
        profit_pct = (profit / bankroll) * 100
        
        return {
            'is_arb': True,
            'total_prob': round(total_prob * 100, 2),
            'margin': round(margin, 2),
            'profit_pct': round(profit_pct, 2),
            'profit_amount': round(profit, 2),
            'total_return': round(total_return, 2),
            'stakes': [round(s, 2) for s in stakes],
            'breakdown': [
                {
                    'outcome': i + 1,
                    'odds': odds_list[i],
                    'stake': round(stakes[i], 2),
                    'potential_return': round(stakes[i] * odds_list[i], 2)
                }
                for i in range(len(odds_list))
            ]
        }
    
    def find_three_way_arbitrage(self, home_odds: float, draw_odds: float, 
                                  away_odds: float, bankroll: float = 1000) -> Dict:
        """
        Find arbitrage in 3-way markets (soccer, etc.).
        """
        return self.find_arbitrage([home_odds, draw_odds, away_odds], bankroll)
    
    def calculate_hedge(self, original_stake: float, original_odds: float, 
                        hedge_odds: float) -> Dict:
        """
        Calculate the perfect hedge bet to guarantee profit.
        
        Use this when:
        - You placed a bet that's now winning
        - You want to lock in profit regardless of outcome
        
        Args:
            original_stake: How much you bet originally
            original_odds: The odds you got (decimal)
            hedge_odds: Current odds for the opposite outcome
            
        Returns:
            Dictionary with hedge amounts and guaranteed profit
        """
        # Total potential payout if original bet wins
        total_payout = original_stake * original_odds
        
        # Required hedge stake to guarantee same return either way
        # If hedge wins: hedge_stake * hedge_odds = original_stake + hedge_stake + profit
        # Simplified: hedge_stake = total_payout / hedge_odds
        hedge_stake = total_payout / hedge_odds
        
        # Calculate guaranteed profit
        total_invested = original_stake + hedge_stake
        
        # If original wins: total_payout - hedge_stake
        profit_if_original = total_payout - hedge_stake - original_stake
        
        # If hedge wins: hedge_stake * hedge_odds - original_stake
        profit_if_hedge = (hedge_stake * hedge_odds) - total_invested
        
        # Average profit (should be same for perfect hedge)
        guaranteed_profit = (profit_if_original + profit_if_hedge) / 2
        
        roi = (guaranteed_profit / total_invested) * 100
        
        return {
            'hedge_stake': round(hedge_stake, 2),
            'total_invested': round(total_invested, 2),
            'guaranteed_profit': round(guaranteed_profit, 2),
            'roi_pct': round(roi, 2),
            'profit_if_original_wins': round(profit_if_original, 2),
            'profit_if_hedge_wins': round(profit_if_hedge, 2)
        }
    
    def calculate_break_even_hedge(self, original_stake: float, original_odds: float,
                                    hedge_odds: float) -> Dict:
        """
        Calculate hedge amount to break even (0 loss, 0 profit).
        
        Use this when you want to get out of a bet without losing money.
        """
        # Break even means: hedge_stake * hedge_odds = original_stake
        # So: hedge_stake = original_stake / hedge_odds
        hedge_stake = original_stake / hedge_odds
        
        return {
            'hedge_stake': round(hedge_stake, 2),
            'total_invested': round(original_stake + hedge_stake, 2),
            'guaranteed_profit': 0,
            'net_result': 'Break Even',
            'explanation': f'Bet ${hedge_stake:.2f} on the opposite outcome to exit the position.'
        }
    
    def calculate_middle_opportunity(self, bet1_spread: float, bet1_odds: float,
                                      bet2_spread: float, bet2_odds: float,
                                      stake: float = 100) -> Optional[Dict]:
        """
        Find "middle" opportunities where both bets can win.
        
        Example: Team A -3 at Book 1, Team B +5 at Book 2
        If Team A wins by 4, BOTH bets win!
        
        Args:
            bet1_spread: Spread for first bet (negative for favorites)
            bet1_odds: Decimal odds for first bet
            bet2_spread: Spread for second bet
            bet2_odds: Decimal odds for second bet
            stake: Amount to bet on each side
        """
        # Check if there's a middle
        gap = bet2_spread - abs(bet1_spread)
        
        if gap <= 0:
            return None
        
        # Calculate potential outcomes
        both_win_profit = (stake * bet1_odds - stake) + (stake * bet2_odds - stake)
        one_wins_profit = (stake * bet1_odds - stake) - stake  # Roughly break even
        
        return {
            'has_middle': True,
            'gap': gap,
            'middle_range': f"If result lands between {abs(bet1_spread)} and {bet2_spread}",
            'if_both_win': round(both_win_profit, 2),
            'if_one_wins': round(one_wins_profit, 2),
            'recommended_stake': stake
        }
    
    def scan_for_arbitrage(self, data: list, odds_key_1: str, odds_key_2: str,
                           bankroll: float = 1000) -> List[Dict]:
        """
        Scan a list of events for arbitrage opportunities.
        
        Args:
            data: List of dictionaries containing event data
            odds_key_1: Key for first odds value
            odds_key_2: Key for second odds value
            bankroll: Amount to bet per opportunity
            
        Returns:
            List of arbitrage opportunities found
        """
        opportunities = []
        
        for i, event in enumerate(data):
            try:
                odds1 = float(event.get(odds_key_1, 0))
                odds2 = float(event.get(odds_key_2, 0))
                
                if odds1 > 1 and odds2 > 1:
                    result = self.find_arbitrage([odds1, odds2], bankroll)
                    
                    if result['is_arb']:
                        opportunities.append({
                            'index': i,
                            'event': event.get('event', event.get('name', f'Event {i}')),
                            'odds_1': odds1,
                            'odds_2': odds2,
                            **result
                        })
            except (ValueError, TypeError):
                continue
        
        # Sort by profit percentage
        opportunities.sort(key=lambda x: x['profit_pct'], reverse=True)
        
        return opportunities
    
    def calculate_dutching(self, odds_list: List[float], target_profit: float = 100) -> Dict:
        """
        Calculate stakes for dutching (backing multiple outcomes for guaranteed profit).
        
        Different from arbitrage - this is used when you want equal profit
        regardless of which selection wins.
        """
        implied_probs = [self.implied_probability(o) for o in odds_list]
        total_prob = sum(implied_probs)
        
        # For dutching to profit, total implied prob must be < 100%
        if total_prob >= 1:
            return {
                'is_profitable': False,
                'message': 'Cannot dutch profitably - market overround too high'
            }
        
        # Calculate required total stake for target profit
        # total_return = total_stake / total_prob
        # profit = total_return - total_stake = target_profit
        # total_stake = target_profit * total_prob / (1 - total_prob)
        total_stake = target_profit * total_prob / (1 - total_prob)
        
        # Distribute stakes proportionally
        stakes = [(total_stake * p) / total_prob for p in implied_probs]
        
        return {
            'is_profitable': True,
            'total_stake': round(total_stake, 2),
            'guaranteed_profit': round(target_profit, 2),
            'roi_pct': round((target_profit / total_stake) * 100, 2),
            'stakes': [round(s, 2) for s in stakes]
        }

