"""
PROGNO Supervisor Prompts
=========================
Specialized prompts for catching math errors in financial calculations.
Used by the Supervisor Agent to validate arbitrage and hedge operations.
"""

# ============================================
# ARBITRAGE VALIDATION PROMPT
# ============================================

ARBITRAGE_VALIDATION_PROMPT = """
You are a financial mathematics auditor. Your job is to verify arbitrage calculations.

ARBITRAGE FORMULA:
- Implied Probability = 1 / Decimal Odds
- Total Probability = Sum of all implied probabilities
- If Total Probability < 100%, arbitrage EXISTS
- Profit % = (1 - Total Probability) × 100
- Stake for outcome i = (Bankroll × Implied Prob_i) / Total Probability

GIVEN DATA:
{input_data}

VALIDATION CHECKLIST:
1. ☐ Are all odds greater than 1.01?
2. ☐ Is the implied probability calculation correct? (1/odds)
3. ☐ Does the sum of implied probabilities match the reported total?
4. ☐ Is the arbitrage determination correct? (total < 1.0 = arb)
5. ☐ Are stakes proportional to implied probabilities?
6. ☐ Does each stake × odds = same total return?
7. ☐ Is profit percentage calculated correctly?
8. ☐ Is profit reasonable? (>15% is suspicious)

RESPOND WITH:
{{
    "is_valid": true/false,
    "errors": ["list of errors found"],
    "warnings": ["list of warnings"],
    "recalculated_values": {{
        "implied_probs": [list],
        "total_prob": float,
        "expected_profit_pct": float
    }}
}}
"""

# ============================================
# HEDGE VALIDATION PROMPT
# ============================================

HEDGE_VALIDATION_PROMPT = """
You are a financial mathematics auditor. Your job is to verify hedge calculations.

HEDGE FORMULA:
- Total Payout = Original Stake × Original Odds
- Hedge Stake = Total Payout / Hedge Odds
- If Original Wins: Profit = Total Payout - Hedge Stake - Original Stake
- If Hedge Wins: Profit = (Hedge Stake × Hedge Odds) - Original Stake - Hedge Stake
- Perfect Hedge: Both profits should be approximately equal

GIVEN DATA:
{input_data}

VALIDATION CHECKLIST:
1. ☐ Are all stakes positive numbers?
2. ☐ Are all odds greater than 1.01?
3. ☐ Is hedge stake calculation correct? (payout / hedge_odds)
4. ☐ Do both outcomes yield the same guaranteed profit?
5. ☐ Is the ROI calculation correct?
6. ☐ Is the guaranteed profit positive?

RESPOND WITH:
{{
    "is_valid": true/false,
    "errors": ["list of errors found"],
    "warnings": ["list of warnings"],
    "recalculated_values": {{
        "expected_hedge_stake": float,
        "profit_if_original": float,
        "profit_if_hedge": float,
        "profit_difference": float
    }}
}}
"""

# ============================================
# PROGNO SCORE VALIDATION PROMPT
# ============================================

PROGNO_SCORE_VALIDATION_PROMPT = """
You are a probability auditor. Your job is to verify sports prediction scores.

PROGNO SCORING RULES:
- Base probability from historical win rate
- Home field adjustment: +5% (multiply by 1.05)
- Momentum: +2% per win streak game (max +10%), -2% per loss
- Time decay: exp(-0.03 × days_ago)
- Injury impact: -3% per severity point
- Sentiment: ±5% based on 0-1 scale
- Final score must be between 0.01 and 0.99

GIVEN DATA:
{input_data}

VALIDATION CHECKLIST:
1. ☐ Is the base probability derived from win rate?
2. ☐ Is home field adjustment applied correctly (if applicable)?
3. ☐ Is momentum calculated correctly for streaks?
4. ☐ Is time decay applied with correct formula?
5. ☐ Are injury deductions appropriate?
6. ☐ Is final score within valid range (0.01-0.99)?
7. ☐ Is the score consistent with the inputs?

RESPOND WITH:
{{
    "is_valid": true/false,
    "errors": ["list of errors found"],
    "warnings": ["list of warnings"],
    "expected_score": float,
    "score_deviation": float
}}
"""

# ============================================
# BATCH COMMIT VALIDATION PROMPT
# ============================================

BATCH_VALIDATION_PROMPT = """
You are a data quality auditor. Your job is to verify batch data before database commit.

REQUIRED FIELDS:
- event_name: non-empty string
- probability_score: float between 0 and 1
- model_version: string (should be consistent)

OPTIONAL FIELDS:
- calc_metadata: object (must not contain PII)
- is_arb_found: boolean
- event_date: ISO timestamp

GIVEN DATA (sample of {total_records} records):
{sample_data}

VALIDATION CHECKLIST:
1. ☐ Do all records have required fields?
2. ☐ Are probability scores in valid range?
3. ☐ Is model_version consistent across batch?
4. ☐ Are there duplicate event_names?
5. ☐ Does metadata contain any PII patterns?
6. ☐ Are timestamps in valid ISO format?

RESPOND WITH:
{{
    "is_valid": true/false,
    "errors": ["list of errors found"],
    "warnings": ["list of warnings"],
    "duplicate_events": [list of duplicates],
    "invalid_score_count": int,
    "pii_detected": true/false
}}
"""

# ============================================
# UTILITY FUNCTIONS
# ============================================

def format_arbitrage_prompt(odds_list: list, result: dict, bankroll: float) -> str:
    """Format the arbitrage validation prompt with actual data."""
    input_data = f"""
Odds: {odds_list}
Bankroll: ${bankroll}
Reported Result:
  - Is Arbitrage: {result.get('is_arb')}
  - Total Probability: {result.get('total_prob')}%
  - Profit Percentage: {result.get('profit_pct')}%
  - Stakes: {result.get('stakes')}
"""
    return ARBITRAGE_VALIDATION_PROMPT.format(input_data=input_data)


def format_hedge_prompt(original_stake: float, original_odds: float, 
                        hedge_odds: float, result: dict) -> str:
    """Format the hedge validation prompt with actual data."""
    input_data = f"""
Original Stake: ${original_stake}
Original Odds: {original_odds}
Hedge Odds: {hedge_odds}
Reported Result:
  - Hedge Stake: ${result.get('hedge_stake')}
  - Guaranteed Profit: ${result.get('guaranteed_profit')}
  - ROI: {result.get('roi_pct')}%
"""
    return HEDGE_VALIDATION_PROMPT.format(input_data=input_data)


def format_score_prompt(row_data: dict, calculated_score: float) -> str:
    """Format the score validation prompt with actual data."""
    input_data = f"""
Input Data:
  - Win Rate: {row_data.get('win_rate', row_data.get('home_win_rate', 'N/A'))}
  - Is Home: {row_data.get('is_home', 'N/A')}
  - Streak: {row_data.get('streak', 'N/A')}
  - Days Ago: {row_data.get('days_ago', 'N/A')}
  - Injury Severity: {row_data.get('injury_severity', 'N/A')}
  - Sentiment Score: {row_data.get('sentiment_score', 'N/A')}

Calculated PROGNO Score: {calculated_score}
"""
    return PROGNO_SCORE_VALIDATION_PROMPT.format(input_data=input_data)


def format_batch_prompt(records: list, sample_size: int = 5) -> str:
    """Format the batch validation prompt with sample data."""
    import json
    sample = records[:sample_size]
    sample_json = json.dumps(sample, indent=2, default=str)
    
    return BATCH_VALIDATION_PROMPT.format(
        total_records=len(records),
        sample_data=sample_json
    )


# ============================================
# MATH ERROR PATTERNS
# ============================================

COMMON_MATH_ERRORS = {
    "arb_prob_sum": {
        "pattern": "Sum of implied probabilities doesn't equal reported total",
        "formula": "total = sum(1/odds for odds in odds_list)",
        "tolerance": 0.0001
    },
    "arb_stake_proportion": {
        "pattern": "Stakes not proportional to implied probabilities",
        "formula": "stake_i = (bankroll × prob_i) / total_prob",
        "tolerance": 0.01
    },
    "arb_profit_calc": {
        "pattern": "Profit percentage miscalculated",
        "formula": "profit_pct = (1 - total_prob) × 100",
        "tolerance": 0.01
    },
    "hedge_stake_calc": {
        "pattern": "Hedge stake calculation error",
        "formula": "hedge_stake = (original_stake × original_odds) / hedge_odds",
        "tolerance": 0.01
    },
    "hedge_profit_mismatch": {
        "pattern": "Both outcomes should yield same profit",
        "formula": "profit_original ≈ profit_hedge",
        "tolerance": 0.10
    },
    "score_out_of_range": {
        "pattern": "PROGNO score outside valid range",
        "formula": "0.01 ≤ score ≤ 0.99",
        "tolerance": 0
    }
}


def get_error_guidance(error_type: str) -> dict:
    """Get guidance for a specific error type."""
    return COMMON_MATH_ERRORS.get(error_type, {
        "pattern": "Unknown error",
        "formula": "N/A",
        "tolerance": 0
    })

