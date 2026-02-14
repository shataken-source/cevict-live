"""
PROGNO MASSAGER - Logic Module
==============================
Enterprise data processing with Supervisor validation.
Universal probability engine for ANY prediction domain.

Supported Domains:
- Sports (NFL, NBA, NCAAF, etc.)
- Prediction Markets (Kalshi, Polymarket)
- Crypto (Bitcoin, Ethereum, DeFi)
- Stocks & Options (Yahoo Finance)
- Weather (Event probability)
"""

# Core calculation functions
from .engine import PrognoEngine

# Arbitrage and hedge calculations
from .arbitrage import ArbitrageCalculator

# Universal probability engine (multi-domain)
from .universal_commands import (
    UniversalPrognoEngine,
    get_universal_engine,
    PredictionMarketCommands,
    OptionsCommands
)

# Data feeds (Kalshi, CoinGecko, Yahoo Finance)
from .data_feeds import (
    FeedAggregator,
    get_feed_aggregator,
    KalshiFeed,
    CoinGeckoFeed,
    YahooFinanceFeed,
    SocialSentimentFeed
)

# Calibration & Learning
from .calibration import (
    PredictionTracker,
    AccuracyAnalyzer,
    WeightOptimizer,
    ConfidenceCalibrator,
    get_tracker,
    get_analyzer,
    get_optimizer,
    get_calibrator
)

# Alerts System
from .alerts import (
    AlertManager,
    ArbitrageScanner,
    Alert,
    AlertType,
    AlertPriority,
    get_alert_manager,
    get_arbitrage_scanner
)

__all__ = [
    # Core Engine
    'PrognoEngine',
    'ArbitrageCalculator',
    
    # Universal (Multi-Domain)
    'UniversalPrognoEngine',
    'get_universal_engine',
    'PredictionMarketCommands',
    'OptionsCommands',
    
    # Data Feeds
    'FeedAggregator',
    'get_feed_aggregator',
    'KalshiFeed',
    'CoinGeckoFeed',
    'YahooFinanceFeed',
    'SocialSentimentFeed',
    
    # Calibration & Learning
    'PredictionTracker',
    'AccuracyAnalyzer',
    'WeightOptimizer',
    'ConfidenceCalibrator',
    'get_tracker',
    'get_analyzer',
    'get_optimizer',
    'get_calibrator',
    
    # Alerts
    'AlertManager',
    'ArbitrageScanner',
    'Alert',
    'AlertType',
    'AlertPriority',
    'get_alert_manager',
    'get_arbitrage_scanner'
]
