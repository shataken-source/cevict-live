# Autonomous Development System - Usage Guide

## Overview

This autonomous system helps debug, test, and run applications with:
- **Frozen Code Detection**: Monitors for infinite loops
- **Sound Notifications**: Alerts when user attention is needed
- **Service Integrations**: Direct access to Vercel, GitHub, Supabase
- **Debug Tools**: Comprehensive logging and error tracking

## Quick Commands

### Run Autonomous Operations

```bash
# Fix errors autonomously
node .autonomous/scripts/autonomous-runner.js --task=fix-errors

# Run tests
node .autonomous/scripts/autonomous-runner.js --task=test

# Deploy to Vercel
node .autonomous/scripts/autonomous-runner.js --task=deploy

# Debug system
node .autonomous/scripts/autonomous-runner.js --task=debug
```

### Debug Helper

```bash
# Check system health
node .autonomous/scripts/debug-helper.js --check

# View recent errors
node .autonomous/scripts/debug-helper.js --errors
```

### Test Runner

```bash
# Run all tests
node .autonomous/scripts/test-runner.js
```

## Sound Notifications

The system will automatically play sounds when:
- **User Attention Needed**: First 3-4 seconds of "Hey Stupid" by Alice Cooper (or system beep)
- **Operation Finished**: Single beep
- **Code Frozen**: Multiple beeps (10x)
- **Error Occurred**: 5 beeps

### Disable Sounds

Edit `.autonomous/config/autonomous.json`:
```json
{
  "settings": {
    "enableSound": false
  }
}
```

## Frozen Code Detection

The system monitors for frozen code by:
- Tracking heartbeat every 5 seconds
- Alerting if no heartbeat for 30+ seconds
- Playing sound notification when frozen
- Breaking infinite loops automatically

### Manual Heartbeat

In your code:
```javascript
const FrozenDetector = require('.autonomous/monitoring/frozen-detector');
const detector = new FrozenDetector();
detector.start();
// ... your code ...
detector.ping(); // Signal still running
```

## Service Integrations

### Vercel

```javascript
const VercelClient = require('.autonomous/integrations/vercel');
const vercel = VercelClient.loadConfig();

// Get deployments
const deployments = await vercel.getDeployments();

// Check deployment status
const isReady = await vercel.isDeploymentReady(deploymentId);
```

### GitHub

```javascript
const GitHubClient = require('.autonomous/integrations/github');
const github = GitHubClient.loadConfig();

// Get latest commit
const commit = await github.getLatestCommit();

// Create issue
await github.createIssue('Title', 'Body', ['bug']);
```

### Supabase

```javascript
const SupabaseHelper = require('.autonomous/integrations/supabase');
const supabase = SupabaseHelper.loadConfig();

// Test connection
const { connected } = await supabase.testConnection();

// Get stats
const stats = await supabase.getStats();
```

## Configuration

### API Keys

1. Copy template:
   ```bash
   cp .autonomous/config/api-keys.json.example .autonomous/config/api-keys.json
   ```

2. Fill in your keys:
   - Vercel token
   - GitHub token
   - Supabase credentials

### Autonomous Settings

Edit `.autonomous/config/autonomous.json`:

```json
{
  "settings": {
    "maxIterations": 10,
    "timeout": 300000,
    "frozenThreshold": 30000,
    "enableSound": true
  },
  "notifications": {
    "onStart": false,
    "onFinish": true,
    "onError": true,
    "onFrozen": true,
    "onUserNeeded": true
  }
}
```

## Debug Features

### Code Snapshots

Save code state before risky operations:
```javascript
const DebugHelper = require('.autonomous/scripts/debug-helper');
const helper = new DebugHelper();

helper.saveSnapshot('app/api/route.ts', 'before-fix');
```

### Error Tracking

Errors are automatically saved to:
- `.autonomous/debug/errors/error-{timestamp}.json`

### Logging

All operations are logged to:
- `.autonomous/debug/logs/debug-{date}.log`

## Troubleshooting

### Sound Not Working

1. Check if sound file exists: `.autonomous/assets/hey-stupid.mp3`
2. System will fallback to beep if file missing
3. Check `enableSound` in config

### Frozen Detection Not Working

1. Check heartbeat file: `.autonomous/monitoring/heartbeat.json`
2. Verify detector is started: `detector.start()`
3. Check threshold in config

### API Integration Failing

1. Verify API keys in `.autonomous/config/api-keys.json`
2. Check environment variables
3. Test connection manually

## Best Practices

1. **Always use frozen detector** for long-running operations
2. **Save snapshots** before risky changes
3. **Check health** before starting autonomous operations
4. **Monitor logs** for debugging
5. **Use sound notifications** to know when help is needed

## File Structure

```
.autonomous/
├── config/          # Configuration files
├── debug/           # Debug logs, snapshots, errors
├── integrations/    # Service integrations
├── monitoring/       # Frozen detection, heartbeats
├── notifications/   # Sound player
├── scripts/         # Main scripts
└── tests/           # Test suites
```

## Next Steps

1. Set up API keys
2. Configure autonomous settings
3. Test sound notifications
4. Run first autonomous operation
5. Monitor logs and errors












