# Integration Examples

## Using in Your Code

### Example 1: Autonomous Error Fixing

```javascript
const AutonomousRunner = require('.autonomous/scripts/autonomous-runner');
const runner = new AutonomousRunner();

// Fix errors autonomously
await runner.start('fix-errors');
```

### Example 2: With Frozen Detection

```javascript
const FrozenDetector = require('.autonomous/monitoring/frozen-detector');
const SoundPlayer = require('.autonomous/notifications/sound-player');

const detector = new FrozenDetector();
const soundPlayer = new SoundPlayer();

detector.onFrozen(async () => {
  await soundPlayer.notifyFrozen();
  // Break the loop
  process.exit(1);
});

detector.start();

// Your long-running operation
for (let i = 0; i < 1000000; i++) {
  detector.ping(); // Signal still running
  // ... do work ...
}

detector.stop();
```

### Example 3: Debug Helper

```javascript
const DebugHelper = require('.autonomous/scripts/debug-helper');
const helper = new DebugHelper();

// Save snapshot before risky change
helper.saveSnapshot('app/api/route.ts', 'before-refactor');

try {
  // Risky operation
  await riskyOperation();
} catch (error) {
  // Save error
  helper.saveError(error, { context: 'refactoring' });
  throw error;
}
```

### Example 4: Service Integration

```javascript
const VercelClient = require('.autonomous/integrations/vercel');
const GitHubClient = require('.autonomous/integrations/github');
const SupabaseHelper = require('.autonomous/integrations/supabase');

// Check Vercel deployment
const vercel = VercelClient.loadConfig();
const deployments = await vercel.getDeployments(5);
console.log('Latest deployment:', deployments.deployments[0]?.url);

// Check GitHub
const github = GitHubClient.loadConfig();
const commit = await github.getLatestCommit();
console.log('Latest commit:', commit.sha);

// Check Supabase
const supabase = SupabaseHelper.loadConfig();
const { connected } = await supabase.testConnection();
console.log('Supabase connected:', connected);
```

### Example 5: Complete Autonomous Workflow

```javascript
const AutonomousRunner = require('.autonomous/scripts/autonomous-runner');
const SoundPlayer = require('.autonomous/notifications/sound-player');
const DebugHelper = require('.autonomous/scripts/debug-helper');

const runner = new AutonomousRunner();
const soundPlayer = new SoundPlayer();
const helper = new DebugHelper();

try {
  // Check health first
  const { healthy, issues } = await helper.checkHealth();
  if (!healthy) {
    console.log('Issues found:', issues);
    await soundPlayer.notifyUserNeeded('System health check failed');
    return;
  }

  // Save snapshot
  helper.saveSnapshot('package.json', 'before-update');

  // Run autonomous task
  await runner.start('fix-errors');

  // Notify completion
  await soundPlayer.notifyFinished('Autonomous operation completed');
} catch (error) {
  helper.saveError(error);
  await soundPlayer.notifyError(error);
  throw error;
}
```












