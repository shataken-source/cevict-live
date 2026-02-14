# Autonomous Development System

This is the "brain dump" folder for autonomous code development, debugging, and testing.

## Structure

```
.autonomous/
├── README.md                 # This file
├── config/
│   ├── api-keys.json         # API keys (gitignored)
│   ├── services.json         # Service configurations
│   └── autonomous.json       # Autonomous operation config
├── debug/
│   ├── logs/                 # Debug logs
│   ├── snapshots/            # Code snapshots
│   └── errors/               # Error dumps
├── tests/
│   ├── autonomous/          # Autonomous test suites
│   └── integration/         # Integration tests
├── monitoring/
│   ├── heartbeat.json        # Heartbeat tracking
│   ├── frozen-detector.js   # Frozen code detection
│   └── metrics.json         # Performance metrics
├── integrations/
│   ├── vercel.js            # Vercel API client
│   ├── github.js           # GitHub API client
│   └── supabase.js          # Supabase utilities
├── notifications/
│   ├── sound-player.js      # Sound notification system
│   └── alerts.js            # Alert system
└── scripts/
    ├── autonomous-runner.js # Main autonomous runner
    ├── debug-helper.js      # Debugging utilities
    └── test-runner.js       # Test execution
```

## Usage

### Running Autonomous Operations

```bash
node .autonomous/scripts/autonomous-runner.js --task="fix errors"
```

### Debugging

```bash
node .autonomous/scripts/debug-helper.js --check
```

### Testing

```bash
node .autonomous/scripts/test-runner.js --suite="autonomous"
```

## Features

- **Frozen Code Detection**: Monitors for infinite loops and frozen operations
- **Sound Notifications**: Plays sounds when user attention is needed
- **Service Integration**: Direct access to Vercel, GitHub, Supabase
- **Debug Logging**: Comprehensive logging and error tracking
- **Code Snapshots**: Save state before risky operations












