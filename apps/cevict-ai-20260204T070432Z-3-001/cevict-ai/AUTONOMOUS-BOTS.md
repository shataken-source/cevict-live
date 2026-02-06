# Cevict AI - Autonomous Bot System

## 🤖 Overview

Cevict.AI features a fully autonomous bot system that monitors, diagnoses, repairs, and deploys without human intervention. The bots live in the **test environment** and monitor **production**, ensuring zero-downtime operations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEST ENVIRONMENT                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              BOT COORDINATOR                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ Monitor  │ │Diagnostic│ │  Repair  │ │  Deploy  │   │   │
│  │  │   Bot    │→│   Bot    │→│   Bot    │→│   Bot    │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │       ↑                                      ↓          │   │
│  │       │         ORCHESTRATOR BOT             │          │   │
│  │       │    (Decision Making & Approval)      │          │   │
│  │       └──────────────────────────────────────┘          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ Monitors                         │
│                              ↓                                  │
├─────────────────────────────────────────────────────────────────┤
│                    PRODUCTION ENVIRONMENT                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Gateway  │ │  PROGNO  │ │Orchestr- │ │ Massager │          │
│  │          │ │          │ │  ator    │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Bot Descriptions

### 1. Monitor Bot 👁️
**Purpose:** Continuously watches production services

- Checks all services every 30 seconds
- Tracks latency, error rates, consecutive failures
- Detects cascade failures
- Identifies patterns indicating systemic issues

### 2. Diagnostic Bot 🔬
**Purpose:** Analyzes issues and determines root cause

- Pattern matching against known error signatures
- Generates repair action suggestions
- Calculates confidence scores
- Finds related issues

### 3. Repair Bot 🔧
**Purpose:** Executes the fix workflow

Workflow:
1. **Copy Prod → Test:** Sync production state to test environment
2. **Apply Fix:** Execute repair action in test
3. **Run Tests:** Validate the fix works
4. **Copy Test → Prod:** Deploy fix to production

### 4. Deploy Bot 🚀
**Purpose:** Handles all deployments

- Validates deployment prerequisites
- Builds services
- Deploys to test or production
- Verifies deployment health
- Supports rollback

### 5. Orchestrator Bot 🧠
**Purpose:** Makes autonomous decisions

- Applies decision rules to issues
- Determines which actions to auto-approve
- Tracks success/failure rates
- Escalates when unsure

## Operation Modes

### 🟢 Autonomous Mode
- Bots can act independently
- Low/medium severity issues fixed automatically
- Critical issues still require approval
- Maximum self-healing capability

### 🟡 Supervised Mode (Default)
- Non-critical actions auto-approved
- Critical actions require human approval
- Balance of automation and control

### 🔴 Manual Mode
- All actions require human approval
- Bots only monitor and suggest
- Full human control

## Decision Rules

The Orchestrator uses these rules to decide actions:

| Condition | Action | Auto-Approve |
|-----------|--------|--------------|
| Timeout (non-critical) | Restart | ✅ Yes |
| Rate limited | Scale | ✅ Yes |
| 401 Unauthorized | Config change | ❌ No |
| Critical crash | Rollback | ❌ No |
| 2+ consecutive failures | Restart | ✅ Yes |
| 500 Server Error | Patch | ❌ No |

## API Endpoints

### Get Bot Status
```bash
GET /api/bots
```

### Control Bots
```bash
POST /api/bots
{
  "action": "start",
  "params": { "mode": "autonomous" }
}
```

Actions:
- `start` - Start bot system
- `stop` - Stop bot system
- `setMode` - Change operation mode
- `approveRepair` - Approve pending repair
- `rejectRepair` - Reject pending repair
- `approveAll` - Approve all pending

### Real-time Events (SSE)
```bash
GET /api/bots/events
```

## Dashboard

Access the bot dashboard at: `/bots`

Features:
- Start/stop bot system
- Change operation modes
- View all bot statuses
- Monitor service health
- See recent issues and decisions
- Approve/reject pending actions

## Example Scenarios

### Scenario 1: Service Timeout
1. **Monitor Bot** detects PROGNO responding slowly (>2000ms)
2. **Diagnostic Bot** identifies as timeout issue
3. **Orchestrator Bot** matches rule: "Auto-restart for timeouts"
4. **Repair Bot** restarts the service
5. **Monitor Bot** verifies service is healthy

### Scenario 2: Critical Crash
1. **Monitor Bot** detects Gateway is unreachable (3 consecutive failures)
2. **Diagnostic Bot** identifies as critical crash
3. **Orchestrator Bot** matches rule: "Rollback for critical crashes"
4. Action queued for **human approval** (critical severity)
5. Admin approves via dashboard
6. **Repair Bot** executes rollback
7. **Deploy Bot** promotes previous version
8. **Monitor Bot** verifies recovery

### Scenario 3: Database Issue
1. **Monitor Bot** detects Supabase errors
2. **Diagnostic Bot** identifies as database connectivity
3. **Orchestrator Bot** suggests config change
4. Admin reviews and approves
5. **Repair Bot** updates environment variables
6. Services automatically reconnect

## Configuration

### Environment Variables

```env
# Bot System
BOT_MONITOR_INTERVAL=30000
BOT_AUTO_APPROVE_LOW_SEVERITY=true
BOT_MAX_RETRIES=3
BOT_DEFAULT_MODE=supervised

# Vercel Integration
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id
```

### Customizing Decision Rules

Edit `lib/bots/orchestrator-bot.ts` to add custom rules:

```typescript
{
  condition: (issue) => 
    issue.service === 'progno' && issue.type === 'error',
  action: 'restart',
  autoApprove: true,
  description: 'Auto-restart PROGNO on errors'
}
```

## Safety Features

1. **Critical actions always require approval** - Rollbacks, patches, and critical severity issues
2. **Test before deploy** - All fixes tested in test environment first
3. **Audit trail** - Complete logging of all bot actions
4. **Mode switching** - Can switch to manual mode instantly
5. **Kill switch** - Stop button halts all bot activity

## Monitoring the Bots

### Health Check
```bash
curl https://test.cevict.ai/api/bots
```

### View Logs
All bot events are logged and available in the dashboard under "Recent Activity"

### Alerts
Configure Slack/Discord webhooks for critical alerts (coming soon)

---

## Quick Start

```bash
# 1. Start the bot system in supervised mode
curl -X POST https://test.cevict.ai/api/bots \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "params": {"mode": "supervised"}}'

# 2. View status
curl https://test.cevict.ai/api/bots

# 3. Switch to autonomous mode
curl -X POST https://test.cevict.ai/api/bots \
  -H "Content-Type: application/json" \
  -d '{"action": "setMode", "params": {"mode": "autonomous"}}'
```

---

© 2025 Cevict LLC - Autonomous AI Infrastructure

