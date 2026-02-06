"""
PROGNO Data Feeds
=================
Multi-source data integration for universal probability predictions.

Supported Sources:
- Kalshi API (Prediction Markets)
- CoinGecko (Crypto Prices)
- Yahoo Finance (Stocks/Options)
- Weather.gov (Weather Events)
- Social APIs (Sentiment)
"""

import os
import json
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np
from abc import ABC, abstractmethod
import logging
import time
import hashlib

logger = logging.getLogger("PROGNO_FEEDS")


# ============================================
# BASE FEED CLASS
# ============================================

class DataFeed(ABC):
    """Base class for all data feeds."""
    
    def __init__(self, api_key: str = None, cache_minutes: int = 5):
        self.api_key = api_key
        self.cache_minutes = cache_minutes
        self._cache: Dict[str, Any] = {}
        self._cache_times: Dict[str, datetime] = {}
    
    def _get_cache_key(self, endpoint: str, params: dict = None) -> str:
        """Generate cache key for request."""
        key_str = endpoint + json.dumps(params or {}, sort_keys=True)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid."""
        if cache_key not in self._cache_times:
            return False
        age = datetime.now() - self._cache_times[cache_key]
        return age.total_seconds() < self.cache_minutes * 60
    
    def _cache_response(self, cache_key: str, data: Any):
        """Store data in cache."""
        self._cache[cache_key] = data
        self._cache_times[cache_key] = datetime.now()
    
    def _get_cached(self, cache_key: str) -> Optional[Any]:
        """Get data from cache if valid."""
        if self._is_cache_valid(cache_key):
            return self._cache.get(cache_key)
        return None
    
    @abstractmethod
    def fetch(self, **kwargs) -> pd.DataFrame:
        """Fetch data and return as DataFrame."""
        pass
    
    @abstractmethod
    def get_domain(self) -> str:
        """Return the domain this feed serves."""
        pass


# ============================================
# KALSHI API (Prediction Markets)
# ============================================

class KalshiFeed(DataFeed):
    """
    Kalshi Prediction Market Data Feed
    https://api.elections.kalshi.com/docs
    Note: API moved to api.elections.kalshi.com in 2025
    """
    
    BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"
    
    def __init__(self, api_key: str = None, private_key: str = None):
        super().__init__(api_key)
        self.api_key = api_key or os.environ.get("KALSHI_API_KEY_ID")
        self.private_key = private_key or os.environ.get("KALSHI_PRIVATE_KEY")
        self.session = requests.Session()
    
    def get_domain(self) -> str:
        return "prediction_markets"
    
    def _get_headers(self) -> Dict[str, str]:
        """Get API headers."""
        return {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    def fetch_markets(self, status: str = "open", limit: int = 100) -> pd.DataFrame:
        """Fetch all open markets."""
        cache_key = self._get_cache_key("markets", {"status": status, "limit": limit})
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached
        
        try:
            url = f"{self.BASE_URL}/markets"
            params = {"status": status, "limit": limit}
            
            response = self.session.get(url, headers=self._get_headers(), params=params)
            response.raise_for_status()
            
            data = response.json()
            markets = data.get("markets", [])
            
            df = pd.DataFrame([{
                "event_id": m.get("ticker"),
                "event_name": m.get("title"),
                "category": m.get("category"),
                "yes_price": m.get("yes_bid", 0) / 100,  # Convert cents to decimal
                "no_price": m.get("no_bid", 0) / 100,
                "yes_ask": m.get("yes_ask", 0) / 100,
                "no_ask": m.get("no_ask", 0) / 100,
                "volume": m.get("volume", 0),
                "open_interest": m.get("open_interest", 0),
                "resolution_date": m.get("close_time"),
                "last_price": m.get("last_price", 50) / 100,
                "domain": "prediction_markets",
                "source": "kalshi",
                "timestamp": datetime.now().isoformat()
            } for m in markets])
            
            self._cache_response(cache_key, df)
            logger.info(f"Kalshi: Fetched {len(df)} markets")
            return df
            
        except Exception as e:
            logger.error(f"Kalshi API error: {e}")
            return pd.DataFrame()
    
    def fetch_market_history(self, ticker: str, days: int = 30) -> pd.DataFrame:
        """Fetch price history for a market."""
        try:
            url = f"{self.BASE_URL}/markets/{ticker}/history"
            params = {"limit": days * 24}  # Hourly data
            
            response = self.session.get(url, headers=self._get_headers(), params=params)
            response.raise_for_status()
            
            data = response.json()
            history = data.get("history", [])
            
            df = pd.DataFrame([{
                "ticker": ticker,
                "timestamp": h.get("ts"),
                "yes_price": h.get("yes_price", 50) / 100,
                "volume": h.get("volume", 0)
            } for h in history])
            
            return df
            
        except Exception as e:
            logger.error(f"Kalshi history error: {e}")
            return pd.DataFrame()
    
    def fetch(self, **kwargs) -> pd.DataFrame:
        """Main fetch method."""
        return self.fetch_markets(**kwargs)


# ============================================
# COINGECKO (Crypto)
# ============================================

class CoinGeckoFeed(DataFeed):
    """
    CoinGecko Crypto Data Feed (Free API)
    https://www.coingecko.com/en/api
    """
    
    BASE_URL = "https://api.coingecko.com/api/v3"
    
    def __init__(self, api_key: str = None):
        super().__init__(api_key, cache_minutes=2)  # Faster cache for crypto
        self.api_key = api_key or os.environ.get("COINGECKO_API_KEY")
    
    def get_domain(self) -> str:
        return "crypto"
    
    def fetch_prices(self, coins: List[str] = None, vs_currency: str = "usd") -> pd.DataFrame:
        """Fetch current prices for top coins."""
        coins = coins or ["bitcoin", "ethereum", "solana", "cardano", "dogecoin", 
                         "xrp", "polkadot", "chainlink", "avalanche-2", "polygon"]
        
        cache_key = self._get_cache_key("prices", {"coins": coins})
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached
        
        try:
            url = f"{self.BASE_URL}/coins/markets"
            params = {
                "vs_currency": vs_currency,
                "ids": ",".join(coins),
                "order": "market_cap_desc",
                "sparkline": "true",
                "price_change_percentage": "1h,24h,7d,30d"
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            df = pd.DataFrame([{
                "event_id": c.get("id"),
                "event_name": f"{c.get('name')} Price Target",
                "symbol": c.get("symbol").upper(),
                "current_price": c.get("current_price", 0),
                "market_cap": c.get("market_cap", 0),
                "volume_24h": c.get("total_volume", 0),
                "price_change_1h": c.get("price_change_percentage_1h_in_currency", 0),
                "price_change_24h": c.get("price_change_percentage_24h", 0),
                "price_change_7d": c.get("price_change_percentage_7d_in_currency", 0),
                "price_change_30d": c.get("price_change_percentage_30d_in_currency", 0),
                "ath": c.get("ath", 0),
                "ath_change_pct": c.get("ath_change_percentage", 0),
                "sparkline": c.get("sparkline_in_7d", {}).get("price", []),
                "domain": "crypto",
                "source": "coingecko",
                "timestamp": datetime.now().isoformat()
            } for c in data])
            
            # Calculate trend based on recent price action
            df['trend'] = np.where(df['price_change_24h'] > 0, 
                                   np.minimum(df['price_change_24h'] / 3, 5),  # Cap at 5
                                   np.maximum(df['price_change_24h'] / 3, -5))
            
            # Calculate momentum score
            df['momentum'] = (df['price_change_1h'] + df['price_change_24h'] / 24 + 
                             df['price_change_7d'] / 168) / 3
            
            self._cache_response(cache_key, df)
            logger.info(f"CoinGecko: Fetched {len(df)} coins")
            return df
            
        except Exception as e:
            logger.error(f"CoinGecko API error: {e}")
            return pd.DataFrame()
    
    def fetch_fear_greed_index(self) -> Dict:
        """Fetch crypto Fear & Greed index."""
        try:
            url = "https://api.alternative.me/fng/"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            current = data.get("data", [{}])[0]
            
            return {
                "value": int(current.get("value", 50)),
                "classification": current.get("value_classification", "Neutral"),
                "timestamp": current.get("timestamp")
            }
            
        except Exception as e:
            logger.error(f"Fear & Greed error: {e}")
            return {"value": 50, "classification": "Neutral"}
    
    def calculate_target_probability(self, df: pd.DataFrame, 
                                      target_pct: float = 10,
                                      days: int = 30) -> pd.DataFrame:
        """
        Calculate probability of hitting price target.
        
        Args:
            target_pct: Target percentage increase (e.g., 10 = +10%)
            days: Time window in days
        """
        if df.empty:
            return df
        
        df = df.copy()
        
        # Base probability from momentum
        df['base_prob'] = 0.5 + (df['momentum'] / 100).clip(-0.3, 0.3)
        
        # Adjust for target distance
        target_factor = 1 - (target_pct / 100)  # Higher target = lower prob
        df['target_adjusted'] = df['base_prob'] * target_factor
        
        # Adjust for time window (more time = higher prob)
        time_factor = min(days / 30, 1.5)  # Cap at 1.5x
        df['progno_score'] = (df['target_adjusted'] * time_factor).clip(0.05, 0.95)
        
        # Add volatility from sparkline
        def calc_volatility(sparkline):
            if not sparkline or len(sparkline) < 2:
                return 0.5
            return np.std(sparkline) / np.mean(sparkline) if np.mean(sparkline) != 0 else 0.5
        
        df['volatility_score'] = df['sparkline'].apply(calc_volatility)
        df['is_high_risk'] = df['volatility_score'] > 0.1
        
        return df
    
    def fetch(self, **kwargs) -> pd.DataFrame:
        """Main fetch method."""
        return self.fetch_prices(**kwargs)


# ============================================
# YAHOO FINANCE (Stocks/Options)
# ============================================

class YahooFinanceFeed(DataFeed):
    """
    Yahoo Finance Data Feed for Stocks and Options
    Uses yfinance library internally
    """
    
    def __init__(self):
        super().__init__(cache_minutes=5)
        try:
            import yfinance as yf
            self.yf = yf
        except ImportError:
            logger.warning("yfinance not installed. Run: pip install yfinance")
            self.yf = None
    
    def get_domain(self) -> str:
        return "stocks"
    
    def fetch_stock_data(self, symbols: List[str] = None) -> pd.DataFrame:
        """Fetch stock data for symbols."""
        if not self.yf:
            return pd.DataFrame()
        
        symbols = symbols or ["NVDA", "AAPL", "GOOGL", "MSFT", "AMZN", 
                             "META", "TSLA", "AMD", "INTC", "SPY"]
        
        cache_key = self._get_cache_key("stocks", {"symbols": symbols})
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached
        
        try:
            data = []
            for symbol in symbols:
                ticker = self.yf.Ticker(symbol)
                info = ticker.info
                hist = ticker.history(period="1mo")
                
                if hist.empty:
                    continue
                
                # Calculate trend
                if len(hist) >= 5:
                    recent = hist['Close'].tail(5)
                    trend = sum(1 if recent.iloc[i] > recent.iloc[i-1] else -1 
                               for i in range(1, len(recent)))
                else:
                    trend = 0
                
                data.append({
                    "event_id": symbol,
                    "event_name": f"{info.get('shortName', symbol)} Price",
                    "symbol": symbol,
                    "current_price": info.get("currentPrice", info.get("regularMarketPrice", 0)),
                    "previous_close": info.get("previousClose", 0),
                    "day_high": info.get("dayHigh", 0),
                    "day_low": info.get("dayLow", 0),
                    "volume": info.get("volume", 0),
                    "avg_volume": info.get("averageVolume", 0),
                    "market_cap": info.get("marketCap", 0),
                    "pe_ratio": info.get("trailingPE", 0),
                    "52w_high": info.get("fiftyTwoWeekHigh", 0),
                    "52w_low": info.get("fiftyTwoWeekLow", 0),
                    "trend": trend,
                    "price_change_pct": ((info.get("currentPrice", 0) - info.get("previousClose", 1)) / 
                                        info.get("previousClose", 1) * 100) if info.get("previousClose") else 0,
                    "domain": "stocks",
                    "source": "yahoo",
                    "timestamp": datetime.now().isoformat()
                })
            
            df = pd.DataFrame(data)
            self._cache_response(cache_key, df)
            logger.info(f"Yahoo: Fetched {len(df)} stocks")
            return df
            
        except Exception as e:
            logger.error(f"Yahoo Finance error: {e}")
            return pd.DataFrame()
    
    def fetch_options_chain(self, symbol: str, expiry_date: str = None) -> pd.DataFrame:
        """Fetch options chain for a symbol."""
        if not self.yf:
            return pd.DataFrame()
        
        try:
            ticker = self.yf.Ticker(symbol)
            
            # Get available expiry dates
            expirations = ticker.options
            if not expirations:
                return pd.DataFrame()
            
            # Use specified or nearest expiry
            expiry = expiry_date if expiry_date in expirations else expirations[0]
            
            # Get options chain
            opts = ticker.option_chain(expiry)
            calls = opts.calls
            puts = opts.puts
            
            current_price = ticker.info.get("currentPrice", ticker.info.get("regularMarketPrice", 0))
            
            # Process calls
            calls_data = []
            for _, row in calls.iterrows():
                strike = row['strike']
                delta = self._estimate_delta(current_price, strike, row['impliedVolatility'], True)
                
                calls_data.append({
                    "event_id": f"{symbol}_{expiry}_C{strike}",
                    "event_name": f"{symbol} ${strike} Call by {expiry}",
                    "symbol": symbol,
                    "option_type": "call",
                    "strike": strike,
                    "expiry": expiry,
                    "current_price": current_price,
                    "last_price": row['lastPrice'],
                    "bid": row['bid'],
                    "ask": row['ask'],
                    "volume": row['volume'],
                    "open_interest": row['openInterest'],
                    "implied_volatility": row['impliedVolatility'],
                    "delta": delta,
                    "progno_score": delta,  # Delta ≈ probability of ITM
                    "domain": "stocks",
                    "source": "yahoo_options",
                    "timestamp": datetime.now().isoformat()
                })
            
            df = pd.DataFrame(calls_data)
            logger.info(f"Yahoo Options: Fetched {len(df)} options for {symbol}")
            return df
            
        except Exception as e:
            logger.error(f"Yahoo Options error: {e}")
            return pd.DataFrame()
    
    def _estimate_delta(self, spot: float, strike: float, iv: float, is_call: bool) -> float:
        """Estimate option delta (simplified Black-Scholes)."""
        try:
            from scipy.stats import norm
            import math
            
            if iv <= 0 or spot <= 0:
                return 0.5
            
            # Simplified delta calculation
            moneyness = math.log(spot / strike) / (iv * math.sqrt(30/365))
            delta = norm.cdf(moneyness)
            
            return delta if is_call else delta - 1
        except:
            # Fallback: simple moneyness estimate
            if is_call:
                return min(max(0.5 + (spot - strike) / (spot * 0.2), 0.05), 0.95)
            else:
                return min(max(0.5 - (spot - strike) / (spot * 0.2), 0.05), 0.95)
    
    def fetch(self, **kwargs) -> pd.DataFrame:
        """Main fetch method."""
        return self.fetch_stock_data(**kwargs)


# ============================================
# SOCIAL SENTIMENT
# ============================================

class SocialSentimentFeed(DataFeed):
    """
    Social Media Sentiment Feed
    Aggregates sentiment from multiple sources.
    """
    
    def __init__(self):
        super().__init__(cache_minutes=10)
    
    def get_domain(self) -> str:
        return "sentiment"
    
    def fetch_reddit_sentiment(self, subreddits: List[str] = None) -> Dict[str, float]:
        """
        Fetch sentiment from Reddit (simplified - would need Reddit API in production).
        Returns sentiment scores by topic.
        """
        # Placeholder - in production, use PRAW (Reddit API)
        # Returns mock data structure
        return {
            "bitcoin": 0.65,
            "ethereum": 0.58,
            "stocks": 0.52,
            "politics": 0.45
        }
    
    def fetch_twitter_sentiment(self, topics: List[str] = None) -> Dict[str, float]:
        """
        Fetch sentiment from Twitter/X.
        Requires Twitter API v2 Bearer Token.
        """
        bearer_token = os.environ.get("TWITTER_BEARER_TOKEN")
        if not bearer_token:
            return {}
        
        # Placeholder - would use Twitter API
        return {}
    
    def fetch(self, **kwargs) -> pd.DataFrame:
        """Main fetch - aggregates all sentiment sources."""
        reddit = self.fetch_reddit_sentiment()
        twitter = self.fetch_twitter_sentiment()
        
        # Combine sentiment scores
        combined = {}
        for topic in set(list(reddit.keys()) + list(twitter.keys())):
            scores = []
            if topic in reddit:
                scores.append(reddit[topic])
            if topic in twitter:
                scores.append(twitter[topic])
            combined[topic] = np.mean(scores) if scores else 0.5
        
        df = pd.DataFrame([
            {"topic": k, "sentiment_score": v, "timestamp": datetime.now().isoformat()}
            for k, v in combined.items()
        ])
        
        return df


# ============================================
# FEED AGGREGATOR
# ============================================

class FeedAggregator:
    """
    Aggregates data from all feeds into a unified format for PROGNO.
    """
    
    def __init__(self):
        self.feeds = {
            "kalshi": KalshiFeed(),
            "coingecko": CoinGeckoFeed(),
            "yahoo": YahooFinanceFeed(),
            "sentiment": SocialSentimentFeed()
        }
        self._last_fetch: Dict[str, datetime] = {}
    
    def get_available_feeds(self) -> List[str]:
        """Return list of available feeds."""
        return list(self.feeds.keys())
    
    def fetch_all(self, domains: List[str] = None) -> pd.DataFrame:
        """
        Fetch data from all (or specified) feeds and combine.
        """
        domains = domains or list(self.feeds.keys())
        all_data = []
        
        for domain in domains:
            if domain in self.feeds:
                try:
                    df = self.feeds[domain].fetch()
                    if not df.empty:
                        all_data.append(df)
                        self._last_fetch[domain] = datetime.now()
                except Exception as e:
                    logger.error(f"Error fetching {domain}: {e}")
        
        if all_data:
            combined = pd.concat(all_data, ignore_index=True)
            return combined
        
        return pd.DataFrame()
    
    def fetch_for_domain(self, domain: str, **kwargs) -> pd.DataFrame:
        """Fetch data for a specific domain."""
        if domain not in self.feeds:
            logger.warning(f"Unknown domain: {domain}")
            return pd.DataFrame()
        
        return self.feeds[domain].fetch(**kwargs)
    
    def get_prediction_markets(self) -> pd.DataFrame:
        """Convenience method for prediction markets."""
        return self.fetch_for_domain("kalshi")
    
    def get_crypto(self, coins: List[str] = None) -> pd.DataFrame:
        """Convenience method for crypto data."""
        feed = self.feeds["coingecko"]
        df = feed.fetch_prices(coins)
        return feed.calculate_target_probability(df)
    
    def get_stocks(self, symbols: List[str] = None) -> pd.DataFrame:
        """Convenience method for stock data."""
        return self.feeds["yahoo"].fetch_stock_data(symbols)
    
    def get_options(self, symbol: str, expiry: str = None) -> pd.DataFrame:
        """Convenience method for options data."""
        return self.feeds["yahoo"].fetch_options_chain(symbol, expiry)
    
    def scan_for_arbitrage(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Scan dataframe for arbitrage opportunities.
        Works across any domain with yes/no or home/away odds.
        """
        from .arbitrage import ArbitrageCalculator
        
        arb_calc = ArbitrageCalculator()
        arb_opportunities = []
        
        for idx, row in df.iterrows():
            # Check for prediction market format
            if 'yes_price' in row and 'no_price' in row:
                yes_odds = 1 / row['yes_price'] if row['yes_price'] > 0 else 100
                no_odds = 1 / row['no_price'] if row['no_price'] > 0 else 100
                
                result = arb_calc.find_arbitrage([yes_odds, no_odds], bankroll=1000)
                
                if result['is_arb']:
                    arb_opportunities.append({
                        **row.to_dict(),
                        'is_arb': True,
                        'arb_profit_pct': result['profit_pct'],
                        'arb_stakes': result['stakes']
                    })
        
        if arb_opportunities:
            return pd.DataFrame(arb_opportunities)
        
        return pd.DataFrame()


# Factory function
def get_feed_aggregator() -> FeedAggregator:
    """Get singleton feed aggregator."""
    return FeedAggregator()

