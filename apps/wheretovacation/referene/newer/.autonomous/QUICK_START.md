# Quick Start Guide

## Setup

1. **Copy API keys template:**
   ```bash
   cp .autonomous/config/api-keys.json.example .autonomous/config/api-keys.json
   ```

2. **Fill in your API keys** in `.autonomous/config/api-keys.json`:
   - Vercel token
   - GitHub token
   - Supabase credentials

3. **Configure autonomous settings** in `.autonomous/config/autonomous.json`

## Usage

### Run Autonomous Operations

```bash
# Fix errors autonomously
node .autonomous/scripts/autonomous-runner.js --task=fix-errors

# Run tests
node .autonomous/scripts/autonomous-runner.js --task=test

# Deploy
node .autonomous/scripts/autonomous-runner.js --task=deploy

# Debug
node .autonomous/scripts/autonomous-runner.js --task=debug
```

### Debug Helper

```bash
# Check system health
node .autonomous/scripts/debug-helper.js --check

# View recent errors
node .autonomous/scripts/debug-helper.js --errors
```

### Sound Notifications

The system will automatically:
- Play sound when user attention is needed
- Play sound when operation finishes
- Play beeps when code is frozen

## Features

- ✅ Frozen code detection
- ✅ Sound notifications
- ✅ Vercel integration
- ✅ GitHub integration
- ✅ Supabase integration
- ✅ Debug logging
- ✅ Code snapshots
- ✅ Error tracking

## Configuration

Edit `.autonomous/config/autonomous.json` to customize:
- Max iterations
- Timeout settings
- Notification preferences
- Service integrations












