"""
PROGNO Accuracy Tracker
=======================
Track prediction outcomes and analyze accuracy for continuous improvement.
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from logic.calibration import get_tracker, get_analyzer, get_optimizer, get_calibrator

st.set_page_config(
    page_title="PROGNO Accuracy Tracker",
    page_icon="📊",
    layout="wide"
)

st.title("📊 PROGNO Accuracy Tracker")
st.markdown("Track predictions, analyze accuracy, and improve over time")

# Initialize components
@st.cache_resource
def get_components():
    tracker = get_tracker()
    analyzer = get_analyzer(tracker)
    optimizer = get_optimizer(tracker)
    calibrator = get_calibrator(analyzer)
    return tracker, analyzer, optimizer, calibrator

tracker, analyzer, optimizer, calibrator = get_components()

# Tabs
tab1, tab2, tab3, tab4 = st.tabs(["📈 Overview", "🎯 Record Predictions", "✅ Update Outcomes", "⚙️ Optimize Weights"])

# ========================================
# TAB 1: OVERVIEW
# ========================================

with tab1:
    st.header("Accuracy Overview")
    
    # Overall metrics
    overall = analyzer.calculate_accuracy()
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "Total Predictions",
            overall.get('total_predictions', 0),
            help="Total predictions tracked"
        )
    
    with col2:
        accuracy = overall.get('accuracy', 0)
        st.metric(
            "Accuracy",
            f"{accuracy:.1%}",
            f"{'+' if accuracy > 0.5 else ''}{(accuracy - 0.5)*100:.1f}% vs random",
            help="Percentage of correct predictions"
        )
    
    with col3:
        brier = overall.get('brier_score', 0.25)
        st.metric(
            "Brier Score",
            f"{brier:.4f}",
            f"{'✅ Good' if brier < 0.2 else '⚠️ Needs work'}",
            help="Lower is better. <0.2 is good, 0 is perfect"
        )
    
    with col4:
        cal_error = overall.get('calibration_error', 0)
        st.metric(
            "Calibration Error",
            f"{cal_error:.4f}",
            help="How well probabilities match actual frequencies"
        )
    
    st.divider()
    
    # Accuracy by domain
    st.subheader("Accuracy by Domain")
    
    by_domain = analyzer.accuracy_by_domain()
    
    if by_domain:
        domain_df = pd.DataFrame([
            {
                "Domain": d.replace("_", " ").title(),
                "Total": s['total'],
                "Correct": s['correct'],
                "Accuracy": f"{s['accuracy']:.1%}",
                "Avg Confidence": f"{s['avg_confidence']:.1%}",
                "Brier Score": f"{s['brier_score']:.4f}"
            }
            for d, s in by_domain.items()
        ])
        
        st.dataframe(domain_df, use_container_width=True, hide_index=True)
        
        # Visualization
        if len(by_domain) > 1:
            import plotly.express as px
            
            chart_data = pd.DataFrame([
                {"Domain": d, "Accuracy": s['accuracy'] * 100, "Total": s['total']}
                for d, s in by_domain.items()
            ])
            
            fig = px.bar(
                chart_data, 
                x="Domain", 
                y="Accuracy",
                color="Accuracy",
                color_continuous_scale="Viridis",
                title="Accuracy by Domain (%)"
            )
            fig.add_hline(y=50, line_dash="dash", annotation_text="Random (50%)")
            
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("No predictions tracked yet. Start recording predictions!")
    
    st.divider()
    
    # Accuracy by confidence level
    st.subheader("Calibration Analysis")
    
    by_confidence = analyzer.accuracy_by_confidence()
    
    if by_confidence:
        cal_df = pd.DataFrame([
            {
                "Confidence Level": level,
                "Range": s['range'],
                "Total": s['total'],
                "Correct": s['correct'],
                "Actual Accuracy": f"{s['accuracy']:.1%}",
                "Expected Accuracy": f"{s['expected_accuracy']:.1%}",
                "Gap": f"{s['calibration_gap']:+.1%}"
            }
            for level, s in by_confidence.items()
        ])
        
        st.dataframe(cal_df, use_container_width=True, hide_index=True)
        
        # Calibration chart
        cal_chart = pd.DataFrame([
            {
                "Confidence": s['expected_accuracy'] * 100,
                "Actual": s['accuracy'] * 100,
                "Count": s['total']
            }
            for s in by_confidence.values()
        ])
        
        st.markdown("""
        **Calibration Interpretation:**
        - If **Actual > Expected**: We're underconfident (good!)
        - If **Actual < Expected**: We're overconfident (need adjustment)
        - Perfect calibration: Points on the diagonal
        """)
    else:
        st.info("Need more predictions with outcomes to analyze calibration")
    
    # Reliability score
    reliability = calibrator.get_reliability_score()
    st.metric(
        "Overall Reliability",
        f"{reliability:.1%}",
        help="How reliable are our predictions? Based on Brier score."
    )

# ========================================
# TAB 2: RECORD PREDICTIONS
# ========================================

with tab2:
    st.header("🎯 Record New Prediction")
    
    st.markdown("Log predictions to track accuracy over time")
    
    with st.form("record_prediction"):
        col1, col2 = st.columns(2)
        
        with col1:
            event_id = st.text_input("Event ID", help="Unique identifier")
            event_name = st.text_input("Event Name", help="e.g., 'Bitcoin > $100K by March'")
            domain = st.selectbox("Domain", [
                "sports", "prediction_markets", "crypto", "stocks", "weather", "other"
            ])
        
        with col2:
            progno_score = st.slider("PROGNO Score", 0.0, 1.0, 0.65, 0.01, 
                                     help="Predicted probability")
            predicted_outcome = st.selectbox("Predicted Outcome", ["Yes", "No", "Home", "Away", "Over", "Under"])
            confidence_level = st.selectbox("Confidence Level", 
                                           ["Low", "Medium", "High", "Very High"])
        
        factors = st.multiselect("Factors Used", [
            "home_bias", "momentum", "time_decay", "sentiment", 
            "arbitrage", "volatility", "injury_impact", "market_efficiency"
        ])
        
        metadata = st.text_area("Additional Metadata (JSON)", "{}")
        
        submitted = st.form_submit_button("📝 Record Prediction", use_container_width=True)
        
        if submitted:
            if not event_id or not event_name:
                st.error("Event ID and Name are required")
            else:
                try:
                    meta = json.loads(metadata) if metadata else {}
                    
                    prediction_id = tracker.record_prediction(
                        event_id=event_id,
                        event_name=event_name,
                        domain=domain,
                        progno_score=progno_score,
                        predicted_outcome=predicted_outcome,
                        confidence_level=confidence_level,
                        factors_used=factors,
                        metadata=meta
                    )
                    
                    st.success(f"✅ Prediction recorded! ID: `{prediction_id}`")
                    
                    # Show calibrated score
                    calibrated, label = calibrator.calibrate(progno_score, domain)
                    st.info(f"📊 Calibrated score: {calibrated:.1%} ({label})")
                    
                except json.JSONDecodeError:
                    st.error("Invalid JSON in metadata")
                except Exception as e:
                    st.error(f"Error: {e}")
    
    # Recent predictions
    st.divider()
    st.subheader("Recent Predictions")
    
    recent = tracker.get_predictions(days_back=7)
    
    if not recent.empty:
        display_cols = ['prediction_id', 'event_name', 'domain', 'progno_score', 
                       'predicted_outcome', 'was_correct', 'created_at']
        
        recent_display = recent[display_cols].copy()
        recent_display['progno_score'] = recent_display['progno_score'].apply(lambda x: f"{x:.1%}")
        recent_display['was_correct'] = recent_display['was_correct'].apply(
            lambda x: "✅" if x == True else ("❌" if x == False else "⏳")
        )
        
        st.dataframe(recent_display.head(20), use_container_width=True, hide_index=True)
    else:
        st.info("No predictions recorded yet")

# ========================================
# TAB 3: UPDATE OUTCOMES
# ========================================

with tab3:
    st.header("✅ Update Prediction Outcomes")
    
    st.markdown("Record actual outcomes to improve accuracy tracking")
    
    # Get unresolved predictions
    all_preds = tracker.get_predictions(resolved_only=False)
    unresolved = all_preds[all_preds['actual_outcome'].isna()] if not all_preds.empty else pd.DataFrame()
    
    if not unresolved.empty:
        st.write(f"**{len(unresolved)} predictions awaiting outcomes**")
        
        for _, row in unresolved.iterrows():
            with st.expander(f"📋 {row['event_name']}", expanded=False):
                col1, col2 = st.columns(2)
                
                with col1:
                    st.write(f"**ID:** {row['prediction_id']}")
                    st.write(f"**Domain:** {row['domain']}")
                    st.write(f"**Predicted:** {row['predicted_outcome']}")
                    st.write(f"**Score:** {row['progno_score']:.1%}")
                    st.write(f"**Created:** {row['created_at']}")
                
                with col2:
                    actual = st.selectbox(
                        "Actual Outcome",
                        ["Yes", "No", "Home", "Away", "Over", "Under", "Push/Void"],
                        key=f"actual_{row['prediction_id']}"
                    )
                    
                    was_correct = st.checkbox(
                        "Prediction was correct?",
                        key=f"correct_{row['prediction_id']}"
                    )
                    
                    if st.button("Update", key=f"update_{row['prediction_id']}"):
                        success = tracker.update_outcome(
                            row['prediction_id'],
                            actual,
                            was_correct
                        )
                        
                        if success:
                            st.success("✅ Outcome recorded!")
                            st.rerun()
                        else:
                            st.error("Failed to update")
    else:
        st.success("🎉 All predictions have outcomes recorded!")
    
    # Bulk update option
    st.divider()
    st.subheader("📥 Bulk Import Outcomes")
    
    st.markdown("""
    Upload a CSV with columns:
    - `prediction_id` - ID from when prediction was recorded
    - `actual_outcome` - What actually happened
    - `was_correct` - True/False
    """)
    
    uploaded = st.file_uploader("Upload CSV", type=['csv'])
    
    if uploaded:
        outcomes_df = pd.read_csv(uploaded)
        
        if st.button("Process Bulk Update"):
            success = 0
            failed = 0
            
            for _, row in outcomes_df.iterrows():
                result = tracker.update_outcome(
                    row['prediction_id'],
                    row['actual_outcome'],
                    bool(row['was_correct'])
                )
                if result:
                    success += 1
                else:
                    failed += 1
            
            st.success(f"Updated {success} predictions ({failed} failed)")

# ========================================
# TAB 4: OPTIMIZE WEIGHTS
# ========================================

with tab4:
    st.header("⚙️ Weight Optimization")
    
    st.markdown("""
    Automatically adjust domain weights based on historical performance.
    The optimizer uses gradient-free hill climbing to minimize Brier score.
    """)
    
    # Domain selector
    domain_to_optimize = st.selectbox(
        "Select Domain to Optimize",
        ["sports", "prediction_markets", "crypto", "stocks", "weather"]
    )
    
    # Current weights
    current_weights = optimizer.get_weights(domain_to_optimize)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Current Weights")
        for key, value in current_weights.items():
            st.write(f"**{key}:** {value}")
    
    with col2:
        st.subheader("Optimization")
        
        min_samples = st.number_input("Minimum Samples Required", 10, 500, 50)
        
        if st.button("🚀 Optimize Weights", use_container_width=True):
            with st.spinner("Optimizing..."):
                result = optimizer.optimize_weights(domain_to_optimize, min_samples)
            
            st.json(result)
            
            if result.get('status') == 'optimized':
                st.success(f"✅ Improved by {result.get('improvement', 0):.2f}%!")
            elif result.get('status') == 'insufficient_data':
                st.warning(f"Need {result['required']} samples, have {result['samples']}")
    
    st.divider()
    
    # Manual weight adjustment
    st.subheader("Manual Weight Adjustment")
    
    st.markdown("Fine-tune weights manually if needed")
    
    with st.form("manual_weights"):
        new_weights = {}
        
        for key, value in current_weights.items():
            if key.endswith('_rate') or key.endswith('_weight') or key.endswith('_bias') or key.endswith('_impact'):
                new_weights[key] = st.slider(key, 0.0, 0.5, float(value), 0.01)
            elif key.endswith('_threshold'):
                new_weights[key] = st.number_input(key, 0, 10, int(value))
            else:
                new_weights[key] = st.number_input(key, min_value=0.0, value=float(value))
        
        if st.form_submit_button("💾 Save Weights"):
            optimizer._current_weights[domain_to_optimize] = new_weights
            optimizer._save_weights(domain_to_optimize, new_weights)
            st.success("✅ Weights saved!")

# Sidebar
with st.sidebar:
    st.header("📊 Quick Stats")
    
    overall = analyzer.calculate_accuracy()
    
    st.metric("Total Tracked", overall.get('total_predictions', 0))
    st.metric("Accuracy", f"{overall.get('accuracy', 0):.1%}")
    st.metric("Brier Score", f"{overall.get('brier_score', 0):.4f}")
    
    st.divider()
    
    st.subheader("🎯 Brier Score Guide")
    st.markdown("""
    - **0.00**: Perfect
    - **0.10**: Excellent
    - **0.20**: Good
    - **0.25**: Random guessing
    - **>0.25**: Worse than random
    """)
    
    st.divider()
    
    if st.button("🔄 Refresh Data"):
        st.rerun()

st.divider()
st.caption("PROGNO Accuracy Tracker | © 2025 Cevict.com | Continuous Improvement")

