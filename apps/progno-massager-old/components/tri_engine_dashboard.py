"""
TRI-ENGINE DASHBOARD
====================
Shows which AI engine (Gemini, Claude, ChatGPT/PROGNO) generated each piece of logic.
Includes hardware monitoring for RTX 4000 SFF Ada and ECC Memory.
"""

import streamlit as st
from datetime import datetime
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from logic.supervisor import get_supervisor, get_hardware_monitor, LegalDisclaimer, TriEngineSource
from logic.supabase_sync import get_memory, WeeklyReportGenerator


def render_tri_engine_sidebar():
    """
    Renders the Tri-Engine status and hardware monitoring in the sidebar.
    """
    st.sidebar.markdown("---")
    st.sidebar.markdown("### 🔧 System Status")
    
    # Hardware Monitor
    hw_monitor = get_hardware_monitor()
    hw_status = hw_monitor.get_full_status()
    
    # GPU Status
    gpu = hw_status['gpu']
    with st.sidebar.expander("🎮 GPU Status", expanded=True):
        st.write(f"**{gpu['name']}**")
        
        # VRAM usage bar
        if gpu['vram_total_mb'] > 0:
            vram_pct = gpu['vram_used_mb'] / gpu['vram_total_mb']
            st.progress(vram_pct)
            st.caption(f"VRAM: {gpu['vram_used_mb']:,} / {gpu['vram_total_mb']:,} MB ({vram_pct*100:.1f}%)")
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Utilization", f"{gpu['utilization_pct']}%")
        with col2:
            st.metric("Temperature", f"{gpu['temperature_c']}°C")
        
        if gpu.get('simulated'):
            st.info("⚠️ Simulated data (nvidia-smi unavailable)")
    
    # ECC Memory Status
    ecc = hw_status['ecc_memory']
    with st.sidebar.expander("💾 ECC Memory", expanded=False):
        if ecc['ecc_enabled']:
            st.success("✅ ECC Memory Active")
        else:
            st.warning("⚠️ Standard Memory (No ECC)")
        st.caption(f"Status: {ecc['status']}")
    
    st.sidebar.markdown("---")
    
    # Tri-Engine Stats
    supervisor = get_supervisor()
    stats = supervisor.get_tri_engine_stats()
    
    st.sidebar.markdown("### 🤖 Tri-Engine Activity")
    
    for engine, data in stats.items():
        if isinstance(data, dict) and data.get('count', 0) > 0:
            icon = {
                'gemini': '🌐',
                'claude': '🧠',
                'progno': '📊',
                'cevict_flex': '⚡',
                'human': '👤'
            }.get(engine, '🔹')
            
            pct = data.get('percentage', 0)
            st.sidebar.progress(pct / 100)
            st.sidebar.caption(f"{icon} {engine.upper()}: {data['count']} ({pct}%)")
    
    st.sidebar.markdown("---")
    
    # Validation Stats
    val_stats = supervisor.get_validation_stats()
    st.sidebar.markdown("### 🛡️ Supervisor Status")
    
    col1, col2 = st.columns(2)
    with col1:
        st.sidebar.metric("✅ Approved", val_stats['approvals'])
    with col2:
        st.sidebar.metric("❌ Rejected", val_stats['rejections'])
    
    st.sidebar.caption(f"Approval Rate: {val_stats['approval_rate']}%")


def render_tri_engine_log():
    """
    Renders the Tri-Engine Log showing which AI generated what.
    """
    st.markdown("## 🔄 Tri-Engine Activity Log")
    st.markdown("""
    This log shows which AI engine contributed to each piece of processing:
    - **🌐 Gemini**: Infrastructure & Stability
    - **🧠 Claude**: Creative Logic & Frontend
    - **📊 PROGNO**: Data Processing & Predictions
    - **⚡ Cevict Flex**: Core Prediction Engine
    """)
    
    supervisor = get_supervisor()
    logs = supervisor.validation_log[-20:]  # Last 20 entries
    
    if not logs:
        st.info("No activity logged yet. Process some data to see Tri-Engine contributions.")
        return
    
    for log in reversed(logs):
        source = log.get('source', 'unknown')
        timestamp = log.get('timestamp', '')
        checks = log.get('checks', {})
        
        # Determine icon and color
        icons = {
            'gemini': ('🌐', 'blue'),
            'claude': ('🧠', 'violet'),
            'progno': ('📊', 'green'),
            'cevict_flex': ('⚡', 'orange'),
            'human': ('👤', 'gray')
        }
        icon, color = icons.get(source, ('🔹', 'gray'))
        
        # Count passed/failed checks
        passed = sum(1 for c in checks.values() if c.get('passed', False))
        total = len(checks)
        
        with st.expander(f"{icon} {source.upper()} - {timestamp[:19]}", expanded=False):
            st.markdown(f"**Source Engine:** {source}")
            st.markdown(f"**Checks Passed:** {passed}/{total}")
            
            for check_name, check_data in checks.items():
                status = "✅" if check_data.get('passed') else "❌"
                st.markdown(f"- {status} **{check_name}**: {check_data.get('message', 'N/A')}")


def render_legal_export_tab():
    """
    Renders the Export tab with legal disclaimers.
    """
    st.markdown("## 📤 Export Data")
    
    # Legal Disclaimer
    st.markdown("### ⚖️ Legal Disclaimer")
    st.text_area(
        "AI Disclosure & Legal Notice",
        value=LegalDisclaimer.get_export_disclaimer(),
        height=300,
        disabled=True
    )
    
    # AI Headers
    st.markdown("### 🏷️ AI Disclosure Headers")
    st.json(LegalDisclaimer.get_ai_disclosure_header())
    
    st.markdown("---")
    
    # Export Options
    st.markdown("### 📁 Export Options")
    
    memory = get_memory()
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("📊 Export as JSON", use_container_width=True):
            # Get recent data (mock for now)
            sample_data = [
                {
                    "event_name": "Sample Event",
                    "probability_score": 0.72,
                    "model_version": "Cevict Flex 1.0"
                }
            ]
            export = memory.export_with_disclaimer(sample_data, 'json')
            st.download_button(
                "⬇️ Download JSON",
                export,
                file_name=f"progno_export_{datetime.now().strftime('%Y%m%d')}.json",
                mime="application/json"
            )
    
    with col2:
        if st.button("📋 Export as CSV", use_container_width=True):
            sample_data = [
                {
                    "event_name": "Sample Event",
                    "probability_score": 0.72,
                    "model_version": "Cevict Flex 1.0"
                }
            ]
            export = memory.export_with_disclaimer(sample_data, 'csv')
            st.download_button(
                "⬇️ Download CSV",
                export,
                file_name=f"progno_export_{datetime.now().strftime('%Y%m%d')}.csv",
                mime="text/csv"
            )


def render_weekly_report_tab():
    """
    Renders the Weekly Report tab for Project Guardian.
    """
    st.markdown("## 📅 Weekly Status Report")
    st.markdown("*Auto-generated for Victoria every Sunday*")
    
    memory = get_memory()
    report_gen = WeeklyReportGenerator(memory)
    
    if st.button("🔄 Generate Report Preview"):
        report = report_gen.generate_report()
        st.text_area("Report Preview", value=report, height=600)
        
        st.download_button(
            "⬇️ Download Report",
            report,
            file_name=f"progno_weekly_report_{datetime.now().strftime('%Y%m%d')}.txt",
            mime="text/plain"
        )
    
    st.markdown("---")
    st.markdown("### 📧 Report Distribution")
    st.markdown("""
    Weekly reports are automatically sent to:
    - **Victoria** (Project Guardian) - Every Sunday at 9:00 AM
    
    To modify recipients, update the report configuration.
    """)


def render_supervisor_dashboard():
    """
    Renders the full Supervisor Agent dashboard.
    """
    st.markdown("## 🛡️ Supervisor Agent Dashboard")
    
    supervisor = get_supervisor()
    stats = supervisor.get_validation_stats()
    
    # Top metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Validations", stats['total_validations'])
    with col2:
        st.metric("Approvals", stats['approvals'], delta=None)
    with col3:
        st.metric("Rejections", stats['rejections'], delta=None)
    with col4:
        st.metric("Approval Rate", f"{stats['approval_rate']}%")
    
    st.markdown("---")
    
    # Recent validation logs
    st.markdown("### 📋 Recent Validation Logs")
    
    logs = stats.get('recent_logs', [])
    if logs:
        for log in reversed(logs[-5:]):
            source = log.get('source', 'unknown')
            timestamp = log.get('timestamp', '')
            checks = log.get('checks', {})
            
            all_passed = all(c.get('passed', False) for c in checks.values())
            status = "✅" if all_passed else "❌"
            
            st.markdown(f"**{status} {timestamp[:19]}** - Source: `{source}`")
            
            for check_name, check_data in checks.items():
                check_status = "✅" if check_data.get('passed') else "❌"
                st.caption(f"  {check_status} {check_name}: {check_data.get('message', '')[:50]}")
    else:
        st.info("No validation logs yet.")


# Main function for standalone testing
if __name__ == "__main__":
    st.set_page_config(
        page_title="PROGNO Tri-Engine Dashboard",
        page_icon="🤖",
        layout="wide"
    )
    
    render_tri_engine_sidebar()
    
    tab1, tab2, tab3, tab4 = st.tabs([
        "🛡️ Supervisor",
        "🔄 Tri-Engine Log", 
        "📤 Export",
        "📅 Weekly Report"
    ])
    
    with tab1:
        render_supervisor_dashboard()
    
    with tab2:
        render_tri_engine_log()
    
    with tab3:
        render_legal_export_tab()
    
    with tab4:
        render_weekly_report_tab()

