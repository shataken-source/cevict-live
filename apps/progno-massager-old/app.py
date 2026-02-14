"""
PROGNO Universal Probability Engine
====================================
A dummy-proof tool for probability calculation across ANY domain.

Domains Supported:
- 🏈 Sports (NFL, NBA, NCAAF, etc.)
- 📊 Prediction Markets (Kalshi, Polymarket)
- 📈 Stocks/Options (strike probability)
- 🪙 Crypto (price targets)
- 🌦️ Weather (event probability)
- 🤖 AI Confidence (meta-predictions)

Features:
- 11+ Built-in massager commands
- Domain-specific probability adjustments
- Cross-platform arbitrage detection
- Supervisor Agent validation
- AI Safety 2025 compliant

Support: Prognostication.com | Cevict.com | Cevict Flex
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')
load_dotenv('.env')

# Import our modules
from logic.engine import PrognoEngine
from logic.arbitrage import ArbitrageCalculator
from logic.supabase_sync import PrognoMemory
from logic.supervisor import SupervisorAgent

# --- PAGE CONFIG ---
st.set_page_config(
    page_title="PROGNO Data Massager",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- CUSTOM CSS ---
st.markdown("""
<style>
    .main { background-color: #0e1117; }
    .stButton>button { 
        width: 100%; 
        border-radius: 8px; 
        height: 3em; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-weight: bold;
        border: none;
    }
    .stButton>button:hover {
        background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    }
    .success-box {
        padding: 20px;
        border-radius: 10px;
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        color: white;
        margin: 10px 0;
    }
    .warning-box {
        padding: 20px;
        border-radius: 10px;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        margin: 10px 0;
    }
    .approval-box {
        padding: 15px;
        border-radius: 10px;
        background: #1e1e1e;
        border: 2px solid #f39c12;
        margin: 10px 0;
    }
    .validation-pass {
        color: #38ef7d;
        font-weight: bold;
    }
    .validation-fail {
        color: #f5576c;
        font-weight: bold;
    }
    h1, h2, h3 { color: #667eea !important; }
</style>
""", unsafe_allow_html=True)

# --- INITIALIZE SESSION STATE ---
if 'df' not in st.session_state:
    st.session_state.df = None
if 'command_history' not in st.session_state:
    st.session_state.command_history = []
if 'arb_results' not in st.session_state:
    st.session_state.arb_results = []
if 'pending_approvals' not in st.session_state:
    st.session_state.pending_approvals = []
if 'validation_log' not in st.session_state:
    st.session_state.validation_log = []

# --- INITIALIZE ENGINES ---
@st.cache_resource
def get_engine():
    return PrognoEngine()

@st.cache_resource
def get_memory():
    return PrognoMemory()

engine = get_engine()
memory = get_memory()
supervisor = engine.supervisor

# --- SIDEBAR: HELP CENTER ---
with st.sidebar:
    st.image("https://via.placeholder.com/200x80?text=PROGNO", use_column_width=True)
    st.title("🎯 Command Center")
    
    # AI Safety Status
    st.subheader("🛡️ AI Safety Status")
    validation_summary = supervisor.get_validation_summary()
    col1, col2 = st.columns(2)
    col1.metric("Validations", validation_summary['total'])
    col2.metric("Pass Rate", f"{validation_summary.get('pass_rate', 0)}%")
    
    pending_count = len(supervisor.get_pending_approvals())
    if pending_count > 0:
        st.warning(f"⚠️ {pending_count} pending approval(s)")
    else:
        st.success("✅ No pending approvals")
    
    st.divider()
    
    # Quick Help
    with st.expander("📖 QUICK START GUIDE", expanded=False):
        st.markdown("""
        **How to Use PROGNO Massager:**
        
        1️⃣ **Upload** your CSV/Excel data
        
        2️⃣ **Select Commands** from the list
        
        3️⃣ **Execute** to massage your data
        
        4️⃣ **Check Arbitrage** for profit opportunities
        
        5️⃣ **Review Validations** from Supervisor
        
        6️⃣ **Approve & Commit** to memory
        """)
    
    # Command Reference
    with st.expander("📋 ALL 11 COMMANDS"):
        st.markdown("""
        | # | Command | Function |
        |---|---------|----------|
        | 1 | Trim Noise | Clean text |
        | 2 | Home Bias | +5% home |
        | 3 | Volatility | Flag risk |
        | 4 | Time-Decay | Weight recent |
        | 5 | Normalize | 0-1 range |
        | 6 | Momentum | ±10% streak |
        | 7 | Injury | Deduct |
        | 8 | Sentiment | Hype adjust |
        | 9 | Arb Finder | Find profit |
        | 10 | Hedge Calc | Insurance |
        | 11 | JSON Export | Web-ready |
        """)
    
    # Test Data Generator
    with st.expander("🧪 GENERATE TEST DATA"):
        if st.button("Create Sample Dataset"):
            sample_df = pd.DataFrame({
                'event': ['Alabama vs Georgia', 'LSU vs Florida', 'Ohio State vs Michigan'],
                'home_team': ['Alabama', 'LSU', 'Ohio State'],
                'away_team': ['Georgia', 'Florida', 'Michigan'],
                'home_odds': [2.10, 1.85, 1.95],
                'away_odds': [1.80, 2.05, 1.90],
                'home_win_rate': [0.85, 0.72, 0.78],
                'is_home': [True, True, True],
                'streak': [4, 2, 5],
                'days_ago': [7, 14, 3],
                'injury_severity': [0, 2, 0],
                'sentiment_score': [0.8, 0.5, 0.9]
            })
            st.session_state.df = sample_df
            st.success("✅ Sample data loaded!")
            st.rerun()
    
    st.divider()
    
    # Memory Status
    st.subheader("🧠 Memory Status")
    if memory.is_connected():
        st.success("Connected to Supabase")
    else:
        st.warning("Configure .env.local for memory")

# --- MAIN HEADER ---
st.title("📊 PROGNO Data Massager")
st.markdown("### Transform Raw Data into Winning Insights")
st.caption("Powered by Cevict Flex | Built for Prognostication.com | AI Safety 2025 Compliant")

# --- APPROVAL WORKFLOW SECTION ---
pending_approvals = supervisor.get_pending_approvals()
if pending_approvals:
    st.divider()
    st.subheader("🔐 Pending Approvals Required")
    st.warning(f"**{len(pending_approvals)} operation(s) require your approval**")
    
    for approval in pending_approvals:
        with st.container():
            st.markdown(f"""
            <div class="approval-box">
                <h4>🔔 {approval.operation_type.upper()}</h4>
                <p>{approval.description}</p>
                <p><strong>Risk Level:</strong> {approval.risk_level.upper()}</p>
            </div>
            """, unsafe_allow_html=True)
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button(f"✅ Approve", key=f"approve_{approval.request_id}"):
                    supervisor.approve_request(approval.request_id, "User")
                    st.success("Approved!")
                    st.rerun()
            with col2:
                if st.button(f"❌ Deny", key=f"deny_{approval.request_id}"):
                    supervisor.deny_request(approval.request_id, "User denied")
                    st.warning("Denied")
                    st.rerun()

# --- FILE UPLOAD SECTION ---
st.divider()
col_upload, col_status = st.columns([3, 1])

with col_upload:
    uploaded_file = st.file_uploader(
        "📁 Drop your data file here",
        type=['csv', 'xlsx', 'json'],
        help="Supports CSV, Excel, and JSON files from RapidAPI"
    )

with col_status:
    if st.session_state.df is not None:
        st.metric("Rows", len(st.session_state.df))
        st.metric("Columns", len(st.session_state.df.columns))

# Load uploaded file
if uploaded_file:
    try:
        if uploaded_file.name.endswith('.csv'):
            st.session_state.df = pd.read_csv(uploaded_file)
        elif uploaded_file.name.endswith('.xlsx'):
            st.session_state.df = pd.read_excel(uploaded_file)
        elif uploaded_file.name.endswith('.json'):
            st.session_state.df = pd.read_json(uploaded_file)
        st.success(f"✅ Loaded {len(st.session_state.df)} rows")
    except Exception as e:
        st.error(f"❌ Error: {e}")

# --- MAIN INTERFACE ---
if st.session_state.df is not None:
    df = st.session_state.df
    
    # Preview Section
    st.subheader("👀 Data Preview")
    st.dataframe(df.head(10), use_container_width=True)
    
    # --- COMMAND EXECUTION PANEL ---
    st.divider()
    st.subheader("🛠️ Step 1: Select & Execute Commands")
    
    available_commands = engine.get_available_commands()
    
    selected_commands = st.multiselect(
        "Choose commands to apply (executes in order):",
        available_commands,
        default=["Trim Noise", "Calculate PROGNO Score"],
        help="Select multiple commands - they execute top to bottom"
    )
    
    col_exec, col_clear = st.columns([3, 1])
    
    with col_exec:
        if st.button("🚀 EXECUTE SELECTED COMMANDS", type="primary"):
            with st.spinner("Massaging your data..."):
                for cmd in selected_commands:
                    df, msg = engine.execute_command(df, cmd)
                    st.session_state.command_history.append({
                        'command': cmd,
                        'time': datetime.now().strftime("%H:%M:%S"),
                        'message': msg
                    })
                    st.toast(msg)
                
                st.session_state.df = df
                st.success(f"✅ Executed {len(selected_commands)} commands!")
                st.rerun()
    
    with col_clear:
        if st.button("🗑️ Reset Data"):
            st.session_state.df = None
            st.session_state.command_history = []
            st.rerun()
    
    # Command history
    if st.session_state.command_history:
        with st.expander("📜 Command History"):
            for item in reversed(st.session_state.command_history[-10:]):
                st.write(f"**{item['time']}** - {item['command']}: {item['message']}")
    
    # --- ARBITRAGE CALCULATOR ---
    st.divider()
    st.subheader("💰 Step 2: Arbitrage & Hedge Calculator")
    
    tab_arb, tab_hedge, tab_batch = st.tabs(["🎯 Quick Arb", "🛡️ Hedge", "📊 Batch Scan"])
    
    with tab_arb:
        st.markdown("**Compare odds from different bookmakers**")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            odds1 = st.number_input("Odds 1", value=2.10, min_value=1.01, step=0.01)
        with col2:
            odds2 = st.number_input("Odds 2", value=2.05, min_value=1.01, step=0.01)
        with col3:
            bankroll = st.number_input("Bankroll ($)", value=1000, min_value=10)
        
        if st.button("🔍 CHECK FOR ARBITRAGE"):
            arb = ArbitrageCalculator()
            result = arb.find_arbitrage([odds1, odds2], bankroll)
            
            # Supervisor validation
            validation = supervisor.validate_arbitrage([odds1, odds2], result)
            
            col_res, col_val = st.columns([2, 1])
            
            with col_res:
                if result['is_arb'] and validation.is_valid:
                    st.markdown(f"""
                    <div class="success-box">
                        <h3>🔥 ARBITRAGE FOUND!</h3>
                        <p><strong>Profit:</strong> ${result['profit_amount']:.2f} ({result['profit_pct']:.2f}%)</p>
                        <p><strong>Bet ${result['stakes'][0]:.2f}</strong> on Outcome 1</p>
                        <p><strong>Bet ${result['stakes'][1]:.2f}</strong> on Outcome 2</p>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f"""
                    <div class="warning-box">
                        <h3>❌ No Arbitrage</h3>
                        <p>House margin: {abs(result.get('margin', 0)):.2f}%</p>
                    </div>
                    """, unsafe_allow_html=True)
            
            with col_val:
                st.markdown("**Supervisor Validation:**")
                if validation.is_valid:
                    st.markdown(f'<p class="validation-pass">✅ VALIDATED</p>', unsafe_allow_html=True)
                    st.write(f"Confidence: {validation.confidence:.1%}")
                else:
                    st.markdown(f'<p class="validation-fail">❌ INVALID</p>', unsafe_allow_html=True)
                    for err in validation.errors:
                        st.error(err)
                
                if validation.warnings:
                    for warn in validation.warnings:
                        st.warning(warn)
    
    with tab_hedge:
        st.markdown("**Calculate the perfect hedge bet**")
        
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("##### Your Original Bet")
            orig_stake = st.number_input("Original Stake ($)", value=100.0, min_value=1.0)
            orig_odds = st.number_input("Original Odds", value=2.50, min_value=1.01)
        with col2:
            st.markdown("##### Hedge Opportunity")
            hedge_odds = st.number_input("Hedge Odds", value=1.80, min_value=1.01)
        
        if st.button("🧮 CALCULATE HEDGE"):
            arb = ArbitrageCalculator()
            result = arb.calculate_hedge(orig_stake, orig_odds, hedge_odds)
            
            # Supervisor validation
            validation = supervisor.validate_hedge(orig_stake, orig_odds, hedge_odds, result)
            
            if validation.is_valid:
                col_r1, col_r2, col_r3 = st.columns(3)
                col_r1.metric("Hedge Amount", f"${result['hedge_stake']:.2f}")
                col_r2.metric("Guaranteed Profit", f"${result['guaranteed_profit']:.2f}")
                col_r3.metric("ROI", f"{result['roi_pct']:.2f}%")
                
                st.success(f"✅ Validated with {validation.confidence:.1%} confidence")
            else:
                st.error("Validation failed:")
                for err in validation.errors:
                    st.error(err)
    
    with tab_batch:
        st.markdown("**Scan entire dataset for arbitrage**")
        
        odds_cols = [c for c in df.columns if 'odds' in c.lower()]
        
        if len(odds_cols) >= 2:
            col1, col2 = st.columns(2)
            with col1:
                odds_col_1 = st.selectbox("Odds Column 1", odds_cols)
            with col2:
                odds_col_2 = st.selectbox("Odds Column 2", [c for c in odds_cols if c != odds_col_1] or odds_cols)
            
            if st.button("🔎 SCAN FOR ALL ARBITRAGE"):
                df, msg = engine.execute_command(df, "Arbitrage Finder", 
                                                  odds_col_1=odds_col_1, 
                                                  odds_col_2=odds_col_2)
                st.session_state.df = df
                st.success(msg)
                
                arb_found = df[df.get('is_arb_opportunity', False) == True]
                if len(arb_found) > 0:
                    st.dataframe(arb_found[['event', odds_col_1, odds_col_2, 'arb_profit_pct']])
        else:
            st.warning("Need at least 2 odds columns")
    
    # --- REPORTS & EXPORT ---
    st.divider()
    st.subheader("📤 Step 3: Export & Save")
    
    col_exp1, col_exp2, col_exp3 = st.columns(3)
    
    with col_exp1:
        csv_data = df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Download CSV",
            data=csv_data,
            file_name=f"PROGNO_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
            mime='text/csv'
        )
    
    with col_exp2:
        json_data = df.to_json(orient='records', indent=2)
        st.download_button(
            label="📥 Download JSON",
            data=json_data,
            file_name=f"PROGNO_{datetime.now().strftime('%Y%m%d_%H%M')}.json",
            mime='application/json'
        )
    
    with col_exp3:
        try:
            from io import BytesIO
            buffer = BytesIO()
            df.to_excel(buffer, index=False)
            st.download_button(
                label="📥 Download Excel",
                data=buffer.getvalue(),
                file_name=f"PROGNO_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx",
                mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        except:
            st.info("Install openpyxl for Excel")
    
    # --- SUPABASE MEMORY SYNC ---
    st.divider()
    st.subheader("🧠 Step 4: Commit to Memory (Supervised)")
    
    st.info("""
    **AI Safety 2025 Compliance:**
    All commits are validated by the Supervisor Agent before persistence.
    Arbitrage and hedge calculations must pass mathematical verification.
    """)
    
    col_mem1, col_mem2 = st.columns([3, 1])
    
    with col_mem1:
        commit_option = st.radio(
            "Commit Mode:",
            ["Standard (Validated)", "Batch Queue (Requires Approval)"],
            help="Standard validates each record. Batch queues all for approval."
        )
    
    with col_mem2:
        if st.button("💾 COMMIT TO MEMORY"):
            if not memory.is_connected():
                st.error("Supabase not connected. Configure .env.local")
            else:
                records = []
                for idx, row in df.iterrows():
                    event_name = row.get('event', row.get('name', f'Event_{idx}'))
                    score = row.get('progno_score', 0.5)
                    
                    records.append({
                        'event_name': str(event_name),
                        'probability_score': float(score),
                        'calc_metadata': {
                            'source': 'massager',
                            'commands': [c['command'] for c in st.session_state.command_history],
                            'is_arb': bool(row.get('is_arb_opportunity', False)),
                            'arb_profit': float(row.get('arb_profit_pct', 0))
                        },
                        'is_arb_found': bool(row.get('is_arb_opportunity', False))
                    })
                
                if commit_option == "Batch Queue (Requires Approval)":
                    result = memory.queue_for_commit(records)
                    if result.get('status') == 'pending_approval':
                        st.warning(f"⏳ Queued {len(records)} records. Approval required.")
                        st.session_state.pending_approvals = memory.get_pending_approvals()
                    elif result.get('success'):
                        st.success(f"✅ Committed {result.get('committed', 0)} records!")
                    else:
                        st.error(f"Error: {result.get('error')}")
                else:
                    # Standard validated commit
                    success_count = 0
                    for record in records:
                        result = memory.save_outcome(
                            event_name=record['event_name'],
                            score=record['probability_score'],
                            metadata=record['calc_metadata']
                        )
                        if result.get('success'):
                            success_count += 1
                    
                    st.success(f"✅ Committed {success_count}/{len(records)} records (validated)")

    # --- VALIDATION LOG ---
    st.divider()
    st.subheader("📋 Validation Log")
    
    summary = supervisor.get_validation_summary()
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Validations", summary['total'])
    col2.metric("Passed", summary['passed'])
    col3.metric("Failed", summary['failed'])
    col4.metric("Avg Confidence", f"{summary['avg_confidence']:.1%}")

# --- NO DATA LOADED STATE ---
else:
    st.info("👆 Upload a file or generate test data to begin!")
    
    st.markdown("""
    ### PROGNO Data Massager Features:
    
    | Feature | Description |
    |---------|-------------|
    | 🧹 **11 Commands** | Clean, transform, and analyze data |
    | 💰 **Arbitrage** | Find guaranteed profit opportunities |
    | 🛡️ **Hedge** | Calculate perfect insurance bets |
    | 🔐 **Supervisor** | Validates all calculations |
    | 📋 **Approval Workflow** | Manual approval for sensitive ops |
    | 🧠 **Memory** | Track predictions in Supabase |
    
    ### AI Safety 2025 Compliant:
    - ✅ All financial calculations validated before commit
    - ✅ System operations require manual approval
    - ✅ Full audit trail of all decisions
    """)

# --- FOOTER ---
st.divider()
st.caption("PROGNO Data Massager v2.0 | © 2025 Cevict.com | Universal Probability Engine | AI Safety 2025 Compliant")
