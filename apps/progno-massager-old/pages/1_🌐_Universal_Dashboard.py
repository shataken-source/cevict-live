"""
PROGNO Universal Dashboard
==========================
Multi-domain prediction interface with real-time data feeds.
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from logic.universal_commands import UniversalPrognoEngine, get_universal_engine
from logic.data_feeds import FeedAggregator, get_feed_aggregator
from logic.calibration import get_tracker, get_analyzer, get_calibrator
from logic.alerts import get_alert_manager, AlertPriority

# Page config
st.set_page_config(
    page_title="PROGNO Universal Dashboard",
    page_icon="🌐",
    layout="wide"
)

# Custom CSS
st.markdown("""
<style>
    .domain-card {
        padding: 20px;
        border-radius: 15px;
        margin: 10px 0;
        transition: transform 0.2s;
    }
    .domain-card:hover {
        transform: scale(1.02);
    }
    .sports-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .markets-card { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
    .crypto-card { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .stocks-card { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .weather-card { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
    .metric-big {
        font-size: 2.5rem;
        font-weight: bold;
        color: white;
    }
    .alert-critical { border-left: 4px solid #e74c3c; }
    .alert-high { border-left: 4px solid #f39c12; }
    .alert-medium { border-left: 4px solid #3498db; }
    .stMetric { background: rgba(255,255,255,0.1); border-radius: 10px; padding: 10px; }
</style>
""", unsafe_allow_html=True)

# Initialize components
@st.cache_resource
def get_components():
    aggregator = get_feed_aggregator()
    tracker = get_tracker()
    analyzer = get_analyzer(tracker)
    calibrator = get_calibrator(analyzer)
    alert_manager = get_alert_manager()
    return aggregator, tracker, analyzer, calibrator, alert_manager

aggregator, tracker, analyzer, calibrator, alert_manager = get_components()

# Session state
if 'selected_domain' not in st.session_state:
    st.session_state.selected_domain = None
if 'live_data' not in st.session_state:
    st.session_state.live_data = {}

# Header
st.title("🌐 PROGNO Universal Dashboard")
st.markdown("**Probability predictions across ALL domains** | Powered by Cevict Flex")

# Alert banner
active_alerts = alert_manager.get_active_alerts()
critical_alerts = [a for a in active_alerts if a.priority == AlertPriority.CRITICAL or a.priority == AlertPriority.HIGH]

if critical_alerts:
    st.error(f"🚨 **{len(critical_alerts)} High Priority Alert(s)**")
    with st.expander("View Alerts", expanded=True):
        for alert in critical_alerts[:5]:
            st.warning(f"**{alert.title}**\n\n{alert.message}")
            if st.button(f"Acknowledge", key=f"ack_{alert.alert_id}"):
                alert_manager.acknowledge_alert(alert.alert_id)
                st.rerun()

st.divider()

# ========================================
# DOMAIN SELECTOR
# ========================================

st.subheader("🎯 Select Domain")

domains = {
    "🏈 Sports": {
        "key": "sports",
        "desc": "NFL, NBA, NCAAF, Soccer",
        "color": "sports-card",
        "icon": "🏈"
    },
    "📊 Prediction Markets": {
        "key": "prediction_markets",
        "desc": "Kalshi, Polymarket events",
        "color": "markets-card",
        "icon": "📊"
    },
    "🪙 Crypto": {
        "key": "crypto",
        "desc": "Bitcoin, Ethereum, DeFi",
        "color": "crypto-card",
        "icon": "🪙"
    },
    "📈 Stocks & Options": {
        "key": "stocks",
        "desc": "Strike probability, IV analysis",
        "color": "stocks-card",
        "icon": "📈"
    },
    "🌦️ Weather": {
        "key": "weather",
        "desc": "Event probability",
        "color": "weather-card",
        "icon": "🌦️"
    }
}

cols = st.columns(5)
for i, (name, config) in enumerate(domains.items()):
    with cols[i]:
        if st.button(config["icon"], key=f"domain_{config['key']}", 
                     use_container_width=True, 
                     type="primary" if st.session_state.selected_domain == config['key'] else "secondary"):
            st.session_state.selected_domain = config['key']
            st.rerun()
        st.caption(name.split(" ")[1])

# Show accuracy for each domain
st.divider()
accuracy_data = analyzer.accuracy_by_domain()

if accuracy_data:
    st.subheader("📊 Domain Accuracy")
    acc_cols = st.columns(len(accuracy_data))
    for i, (domain, stats) in enumerate(accuracy_data.items()):
        with acc_cols[i]:
            st.metric(
                domain.replace("_", " ").title(),
                f"{stats['accuracy']:.1%}",
                f"{stats['total']} predictions"
            )

st.divider()

# ========================================
# DOMAIN-SPECIFIC CONTENT
# ========================================

selected = st.session_state.selected_domain

if selected == "crypto":
    st.header("🪙 Crypto Probability Engine")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("Live Prices & Probability")
        
        # Fetch crypto data
        with st.spinner("Fetching crypto data..."):
            df = aggregator.get_crypto()
        
        if not df.empty:
            st.session_state.live_data['crypto'] = df
            
            # Configure target
            target_pct = st.slider("Target % Increase", 5, 50, 10, 5)
            days = st.slider("Time Window (days)", 7, 90, 30, 7)
            
            # Recalculate with target
            feed = aggregator.feeds['coingecko']
            df = feed.calculate_target_probability(df, target_pct=target_pct, days=days)
            
            # Display results
            display_cols = ['symbol', 'current_price', 'price_change_24h', 
                          'momentum', 'progno_score', 'is_high_risk']
            
            df_display = df[display_cols].copy()
            df_display['progno_score'] = df_display['progno_score'].apply(lambda x: f"{x:.1%}")
            df_display['price_change_24h'] = df_display['price_change_24h'].apply(lambda x: f"{x:+.1f}%")
            df_display['current_price'] = df_display['current_price'].apply(lambda x: f"${x:,.2f}")
            
            st.dataframe(df_display, use_container_width=True)
            
            # Check for alerts
            alerts = alert_manager.check_dataframe(df)
            if alerts:
                st.success(f"✅ Generated {len(alerts)} alerts")
        else:
            st.warning("Could not fetch crypto data")
    
    with col2:
        st.subheader("🧠 Model Settings")
        
        engine = get_universal_engine('crypto')
        config = engine.get_domain_config()
        
        st.write("**Current Weights:**")
        for key, value in config.items():
            st.write(f"- {key}: `{value}`")
        
        # Fear & Greed
        st.subheader("😱 Fear & Greed")
        feed = aggregator.feeds['coingecko']
        fg = feed.fetch_fear_greed_index()
        
        fg_value = fg.get('value', 50)
        fg_class = fg.get('classification', 'Neutral')
        
        st.metric("Index", fg_value, fg_class)
        
        if fg_value < 25:
            st.info("🔵 Extreme Fear - Potential buying opportunity")
        elif fg_value < 45:
            st.info("😰 Fear - Market cautious")
        elif fg_value < 55:
            st.info("😐 Neutral")
        elif fg_value < 75:
            st.info("😊 Greed - Market optimistic")
        else:
            st.warning("🔴 Extreme Greed - Exercise caution")

elif selected == "prediction_markets":
    st.header("📊 Prediction Markets Engine")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("Live Markets")
        
        with st.spinner("Fetching prediction markets..."):
            df = aggregator.get_prediction_markets()
        
        if not df.empty:
            st.session_state.live_data['prediction_markets'] = df
            
            # Filter by category
            categories = ['All'] + list(df['category'].dropna().unique())
            selected_cat = st.selectbox("Category", categories)
            
            if selected_cat != 'All':
                df = df[df['category'] == selected_cat]
            
            # Add PROGNO score using universal engine
            engine = get_universal_engine('prediction_markets')
            
            for idx, row in df.iterrows():
                # Calculate resolution time urgency
                if row.get('resolution_date'):
                    try:
                        res_date = pd.to_datetime(row['resolution_date'])
                        days_until = (res_date - datetime.now()).days
                        df.loc[idx, 'days_until_resolution'] = max(0, days_until)
                    except:
                        df.loc[idx, 'days_until_resolution'] = 30
                
                # Use last_price as base probability
                df.loc[idx, 'progno_score'] = row.get('last_price', 0.5)
            
            # Display
            display_cols = ['event_name', 'category', 'yes_price', 'no_price', 
                          'volume', 'progno_score']
            
            df_display = df[display_cols].copy()
            df_display['yes_price'] = df_display['yes_price'].apply(lambda x: f"{x:.0%}" if x else "N/A")
            df_display['no_price'] = df_display['no_price'].apply(lambda x: f"{x:.0%}" if x else "N/A")
            df_display['progno_score'] = df_display['progno_score'].apply(lambda x: f"{x:.0%}")
            
            st.dataframe(df_display, use_container_width=True)
            
            # Arbitrage scan
            st.subheader("💰 Arbitrage Scanner")
            from logic.alerts import ArbitrageScanner
            scanner = ArbitrageScanner(alert_manager)
            
            opps = scanner.scan_prediction_markets(df)
            
            if opps:
                st.success(f"🔥 Found {len(opps)} arbitrage opportunities!")
                for opp in opps:
                    st.write(f"**{opp['event_name']}** - Profit: {opp['profit_pct']:.2f}%")
            else:
                st.info("No arbitrage opportunities currently available")
        else:
            st.warning("Could not fetch prediction market data")
    
    with col2:
        st.subheader("🧠 Model Settings")
        
        engine = get_universal_engine('prediction_markets')
        config = engine.get_domain_config()
        
        st.write("**Current Weights:**")
        for key, value in config.items():
            st.write(f"- {key}: `{value}`")

elif selected == "stocks":
    st.header("📈 Stocks & Options Engine")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("Stock Prices")
        
        # Custom symbols input
        default_symbols = "NVDA,AAPL,GOOGL,MSFT,AMZN,META,TSLA,AMD"
        symbols_input = st.text_input("Symbols (comma-separated)", default_symbols)
        symbols = [s.strip().upper() for s in symbols_input.split(",")]
        
        with st.spinner("Fetching stock data..."):
            df = aggregator.get_stocks(symbols)
        
        if not df.empty:
            st.session_state.live_data['stocks'] = df
            
            display_cols = ['symbol', 'current_price', 'price_change_pct', 
                          'volume', 'trend', 'pe_ratio']
            
            df_display = df[display_cols].copy()
            df_display['current_price'] = df_display['current_price'].apply(lambda x: f"${x:,.2f}" if x else "N/A")
            df_display['price_change_pct'] = df_display['price_change_pct'].apply(lambda x: f"{x:+.2f}%" if x else "N/A")
            df_display['volume'] = df_display['volume'].apply(lambda x: f"{x/1e6:.1f}M" if x else "N/A")
            
            st.dataframe(df_display, use_container_width=True)
        
        # Options chain
        st.subheader("📊 Options Probability")
        
        opt_symbol = st.selectbox("Select Symbol for Options", symbols)
        
        if st.button("Load Options Chain"):
            with st.spinner(f"Fetching options for {opt_symbol}..."):
                opts_df = aggregator.get_options(opt_symbol)
            
            if not opts_df.empty:
                # Filter to relevant strikes
                current = df[df['symbol'] == opt_symbol]['current_price'].iloc[0] if opt_symbol in df['symbol'].values else 100
                
                opts_df = opts_df[
                    (opts_df['strike'] >= current * 0.9) & 
                    (opts_df['strike'] <= current * 1.1)
                ]
                
                display_cols = ['strike', 'expiry', 'last_price', 'implied_volatility', 'delta', 'progno_score']
                
                opts_display = opts_df[display_cols].copy()
                opts_display['implied_volatility'] = opts_display['implied_volatility'].apply(lambda x: f"{x:.1%}")
                opts_display['delta'] = opts_display['delta'].apply(lambda x: f"{x:.2f}")
                opts_display['progno_score'] = opts_display['progno_score'].apply(lambda x: f"{x:.1%}")
                
                st.dataframe(opts_display, use_container_width=True)
            else:
                st.warning("Could not fetch options data")
    
    with col2:
        st.subheader("🧠 Model Settings")
        
        engine = get_universal_engine('stocks')
        config = engine.get_domain_config()
        
        st.write("**Current Weights:**")
        for key, value in config.items():
            st.write(f"- {key}: `{value}`")

elif selected == "sports":
    st.header("🏈 Sports Prediction Engine")
    st.info("Sports data integration coming soon! Use the main Data Massager for sports predictions.")
    
    # Show link to main app
    st.markdown("""
    **Available Features:**
    - ✅ 11 Massager Commands
    - ✅ Home field bias
    - ✅ Momentum analysis
    - ✅ Injury impact
    - ✅ Sentiment integration
    
    Use the **Data Massager** tab to load and analyze sports data.
    """)

elif selected == "weather":
    st.header("🌦️ Weather Probability Engine")
    st.info("Weather integration coming soon!")
    
    st.markdown("""
    **Planned Features:**
    - Weather event probability
    - Severe weather predictions
    - Sports game weather impact
    - Insurance/travel planning
    """)

else:
    # No domain selected - show overview
    st.info("👆 Select a domain above to begin")
    
    st.markdown("""
    ## What You Can Do:
    
    | Domain | Use Cases |
    |--------|-----------|
    | 🏈 **Sports** | Game outcomes, player props, betting edges |
    | 📊 **Prediction Markets** | Political events, economic indicators, binary outcomes |
    | 🪙 **Crypto** | Price targets, DeFi yields, token probability |
    | 📈 **Stocks** | Strike probability, options delta, price targets |
    | 🌦️ **Weather** | Event probability, severe weather, travel planning |
    
    ---
    
    ### 🎯 How It Works
    
    1. **Select Domain** - Choose your prediction type
    2. **Load Data** - Real-time feeds or upload your own
    3. **Apply Commands** - Domain-specific probability adjustments
    4. **Get Alerts** - Arbitrage opportunities, high-confidence predictions
    5. **Track Accuracy** - Learn and improve over time
    """)

# ========================================
# SIDEBAR: System Status
# ========================================

with st.sidebar:
    st.header("⚙️ System Status")
    
    # Accuracy metrics
    overall_acc = analyzer.calculate_accuracy()
    
    st.metric("Total Predictions", overall_acc.get('total_predictions', 0))
    st.metric("Overall Accuracy", f"{overall_acc.get('accuracy', 0):.1%}")
    st.metric("Brier Score", f"{overall_acc.get('brier_score', 0):.3f}")
    
    st.divider()
    
    # Alert summary
    st.subheader("🔔 Alerts")
    alert_summary = alert_manager.get_alert_summary()
    
    st.write(f"**Last 24h:** {alert_summary.get('total_24h', 0)}")
    st.write(f"**Active:** {alert_summary.get('active_count', 0)}")
    
    by_type = alert_summary.get('by_type', {})
    if by_type:
        st.write("**By Type:**")
        for t, count in by_type.items():
            if count > 0:
                st.write(f"- {t}: {count}")
    
    st.divider()
    
    # Data feeds status
    st.subheader("📡 Data Feeds")
    
    feeds = aggregator.get_available_feeds()
    for feed in feeds:
        st.write(f"✅ {feed}")
    
    st.divider()
    
    # Quick actions
    st.subheader("⚡ Quick Actions")
    
    if st.button("🔄 Refresh All Data"):
        st.cache_data.clear()
        st.rerun()
    
    if st.button("📊 Generate Report"):
        report = analyzer.get_calibration_report()
        st.json(report)

# Footer
st.divider()
st.caption("PROGNO Universal Dashboard v2.0 | © 2025 Cevict.com | AI Safety 2025 Compliant")

