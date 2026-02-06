# 📊 PROGNO Data Massager

**Transform raw sports data into winning insights with AI Safety 2025 compliance.**

A dummy-proof tool for massaging sports data, finding arbitrage, calculating hedges, and generating production-ready reports for Prognostication.com.

---

## ✨ What's New: AI Safety 2025

This version implements **AI Safety 2025 standards**:

| Feature | Description |
|---------|-------------|
| 🛡️ **Supervisor Agent** | Validates all calculations before commit |
| 🔐 **Approval Workflow** | Sensitive operations require manual approval |
| 📋 **Audit Trail** | Full logging of all decisions |
| 🚫 **Kill Switch** | Disable autonomous operations instantly |
| ✅ **Math Verification** | Arbitrage/hedge calculations verified |

---

## 🚀 Quick Start

### Option 1: Double-click launcher
```
launch_massager.bat   (Windows)
```

### Option 2: Command line
```bash
cd apps/progno-massager
pip install -r requirements.txt
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
streamlit run app.py
```

Then open: **http://localhost:8501**

---

## 🎯 Features

### The 11 Massager Commands

| # | Command | Function | Validation |
|---|---------|----------|------------|
| 1 | **Trim Noise** | Strip spaces, special chars | Auto |
| 2 | **Home Field Bias** | +5% for home teams | Auto |
| 3 | **Volatility Filter** | Flag high-risk rows | Auto |
| 4 | **Time-Decay** | Weight recent data higher | Auto |
| 5 | **Cevict Flex Squeeze** | Normalize to 0-1 | Auto |
| 6 | **Momentum Bonus** | ±10% for streaks | Auto |
| 7 | **Injury Leveler** | Deduct for injuries | Auto |
| 8 | **Sentiment Infusion** | Adjust for hype | Auto |
| 9 | **Arbitrage Finder** | Find profit opportunities | **Supervisor** |
| 10 | **Hedge Calculator** | Calculate insurance bets | **Supervisor** |
| 11 | **JSON Export** | Web-ready format | Auto |

### 💰 Arbitrage Calculator (Supervised)
- Quick arb check between bookmakers
- **Mathematical validation before commit**
- 3-way market support
- Dutching calculator
- Profit reasonability checks

### 🛡️ Hedge Calculator (Supervised)
- Perfect hedge amounts
- Break-even calculations
- **Both-outcome verification**
- ROI projections

### 🧠 Supabase Memory (Validated)
- Track all predictions
- **Batch commits require approval**
- Verify accuracy over time
- Search historical events

---

## 🔐 Supervisor Agent

The Supervisor Agent validates all financial calculations:

```python
# Example: Arbitrage validation
result = arb_calculator.find_arbitrage([2.10, 2.05], 1000)
validation = supervisor.validate_arbitrage([2.10, 2.05], result)

if validation.is_valid:
    print(f"✅ Validated with {validation.confidence:.1%} confidence")
else:
    print(f"❌ Errors: {validation.errors}")
```

### What Gets Validated:
- ✅ Odds within valid range (1.01 - 1000)
- ✅ Implied probability calculations
- ✅ Stake distribution correctness
- ✅ Profit percentage accuracy
- ✅ Reasonability checks (>15% arb flagged)

### Approval Workflow

```
User Action → Supervisor Check → Validation
                    ↓
            [If sensitive operation]
                    ↓
            Approval Request → UI Confirmation → Execute
```

Risk Levels:
- **Low**: Auto-approved
- **Medium**: Warning shown, auto-approved
- **High**: Requires manual approval
- **Critical**: Always requires approval, cannot bypass

---

## 📁 File Structure

```
progno-massager/
├── app.py                      # Main Streamlit application
├── requirements.txt            # Python dependencies
├── launch_massager.bat         # Windows launcher
├── launch_massager.ps1         # PowerShell launcher
├── .env.local.example          # Environment template
├── supabase-schema.sql         # Database schema
└── logic/
    ├── __init__.py             # Module exports
    ├── engine.py               # 11 Commands + probability math
    ├── arbitrage.py            # Arb & hedge calculations
    ├── commands.py             # Data manipulation commands
    ├── supervisor.py           # AI Safety validation layer
    ├── supabase_sync.py        # Memory with validation
    └── local_agent.py          # System commands (with approval)
```

---

## ⚙️ Configuration

### 1. Copy environment file
```bash
cp .env.local.example .env.local
```

### 2. Add your Supabase credentials
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Optional: Disable safety checks (NOT RECOMMENDED)
SUPERVISOR_AUTONOMOUS_MODE=false
```

### 3. Create the memory table
Run `supabase-schema.sql` in your Supabase SQL Editor.

---

## 🔒 Local Agent Safety

The Local Agent handles system commands with strict controls:

```python
# Blocked commands (NEVER executed)
BLOCKED = ['rm -rf', 'format', 'shutdown', 'drop database']

# Critical commands (require HIGH approval)
CRITICAL = ['rm', 'sudo', 'pip install', 'curl']
```

All system commands require UI approval:

```python
# Request approval
request = local_agent.request_execution("pip install package")

# After UI approval
result = local_agent.execute_approved(request.request_id, "pip install package")
```

---

## 📊 Usage Workflow

1. **Upload** - Load CSV/Excel/JSON data
2. **Preview** - Review raw data
3. **Select Commands** - Choose massaging operations
4. **Execute** - Apply commands (validated)
5. **Check Arbitrage** - Scan for opportunities (supervised)
6. **Review Validations** - Check Supervisor results
7. **Approve Operations** - Manual confirmation for sensitive ops
8. **Export** - Download CSV/JSON/Excel
9. **Commit to Memory** - Save to Supabase (validated)

---

## 🧮 The Math

### PROGNO Score
```
Base × Home Bias × Momentum × Time Decay × Injury × Sentiment
```

### Arbitrage Detection (Validated)
```
If (1/Odds1 + 1/Odds2) < 1.0 → Arbitrage exists

Supervisor checks:
- Sum of implied probs correct
- Stakes proportional to probs
- Profit calculation accurate
- Result is reasonable (<15%)
```

### Hedge Formula (Validated)
```
Hedge Stake = (Original Stake × Original Odds) / Hedge Odds

Supervisor checks:
- Both outcomes yield similar profit
- Guaranteed profit calculated correctly
```

---

## 🔗 Integration with Prognostication.com

The JSON export is designed for direct integration:

```json
{
  "event": "Alabama vs Georgia",
  "progno_score": 0.78,
  "confidence_label": "Lean Home",
  "is_high_risk": false,
  "validation_confidence": 0.95,
  "timestamp": "2025-01-15T10:30:00"
}
```

---

## 🛠️ Developer Guide

### Adding a New Command

```python
# In logic/engine.py
def cmd_my_command(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
    """My new command description."""
    # Your logic here
    return df, "✅ Command completed"

# Add to command_map in execute_command()
```

### Adding Validation Rules

```python
# In logic/supervisor.py
def validate_my_operation(self, data: Dict) -> ValidationResult:
    errors = []
    warnings = []
    
    # Your validation logic
    if not valid:
        errors.append("Reason")
    
    return self._create_result(len(errors) == 0, confidence, errors, warnings)
```

---

## 📝 License

© 2025 Cevict.com | Powered by Cevict Flex | AI Safety 2025 Compliant

---

## 🆘 Need Help?

1. Check the **Help Center** in the sidebar
2. Review **Pending Approvals** at the top
3. Check **Validation Log** at the bottom
4. Use **Generate Test Data** to practice
