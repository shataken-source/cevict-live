# 🤖 Local Agent

**Claude's Autonomous Helper - You Are Now Out of the Loop!**

This agent runs on your machine and acts as Claude's hands, executing tasks autonomously without needing your intervention.

## Features

- 💻 **Command Execution** - Runs any terminal command
- 📁 **File Operations** - Read, write, search, replace files
- 🧠 **Claude Integration** - Asks Claude to plan complex tasks
- 📅 **Scheduler** - Runs tasks on a schedule
- 🖥️ **System Monitor** - Tracks CPU, memory, disk usage
- 📋 **Task Queue** - Manages prioritized task list
- 🔌 **REST API** - Control from anywhere
- 🌐 **WebSocket** - Real-time communication

## Quick Start

```bash
# 1. Navigate to the agent
cd apps/local-agent

# 2. Install dependencies
pnpm install

# 3. Configure
cp .env.example .env.local
# Edit .env.local with your ANTHROPIC_API_KEY

# 4. Start the agent
pnpm start
```

## The One Command To Rule Them All

```powershell
cd C:\gcc\cevict-app\cevict-monorepo\apps\local-agent && pnpm install && pnpm start
```

## API Endpoints

Once running on `http://localhost:3847`:

### Execute Command
```bash
curl -X POST http://localhost:3847/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "git status"}'
```

### Read File
```bash
curl -X POST http://localhost:3847/file/read \
  -H "Content-Type: application/json" \
  -d '{"path": "package.json"}'
```

### Write File
```bash
curl -X POST http://localhost:3847/file/write \
  -H "Content-Type: application/json" \
  -d '{"path": "test.txt", "content": "Hello World"}'
```

### Autonomous Task
```bash
curl -X POST http://localhost:3847/autonomous \
  -H "Content-Type: application/json" \
  -d '{"task": "Run Alpha Hunter and send me the results"}'
```

### Ask Claude
```bash
curl -X POST http://localhost:3847/claude/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "How can I optimize PROGNO?"}'
```

### Run Alpha Hunter
```bash
curl -X POST http://localhost:3847/alpha-hunter/run
```

### Git Commit & Push
```bash
curl -X POST http://localhost:3847/git/commit \
  -H "Content-Type: application/json" \
  -d '{"message": "Auto-commit from local agent"}'

curl -X POST http://localhost:3847/git/push
```

### Check Health
```bash
curl http://localhost:3847/health
```

### System Info
```bash
curl http://localhost:3847/system
```

## Scheduled Tasks

The agent runs these automatically:

| Time (ET) | Task |
|-----------|------|
| 6:00 AM | Morning Alpha Hunt |
| 9:00 AM | Main Trading Session |
| 12:00 PM | Midday Progress Check |
| 5:00 PM | Evening Sports Scan |
| 10:00 PM | Daily Summary |
| Every 30m | System Health Check |
| Sundays 3AM | Weekly Cleanup |

## WebSocket Connection

Connect to `ws://localhost:3847` for real-time communication:

```javascript
const ws = new WebSocket('ws://localhost:3847');

ws.onopen = () => {
  // Execute a command
  ws.send(JSON.stringify({
    type: 'execute',
    command: 'git status'
  }));

  // Run an autonomous task
  ws.send(JSON.stringify({
    type: 'task',
    task: 'Deploy all changes to production'
  }));
};

ws.onmessage = (event) => {
  console.log('Result:', JSON.parse(event.data));
};
```

## Running as a Service

To run the agent as a background service that starts with Windows:

```powershell
# Create a scheduled task
$action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument "-NoProfile -Command `"cd C:\gcc\cevict-app\cevict-monorepo\apps\local-agent; pnpm start`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "LocalAgent" -Action $action -Trigger $trigger -RunLevel Highest
```

## What Can It Do?

### Autonomous Operations
- Run Alpha Hunter daily scans
- Execute git commits and pushes
- Deploy to Vercel
- Monitor system health
- Send SMS alerts
- Install dependencies
- Run builds and tests

### File Management
- Read any file in workspace
- Write/create files
- Search across codebase
- Find and replace text
- Create directories

### Claude Integration
- Ask Claude for advice
- Generate code
- Review code
- Plan complex tasks
- Analyze errors

## Example: Full Autonomous Flow

```bash
curl -X POST http://localhost:3847/autonomous \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Check if there are any code changes, commit them with a descriptive message, push to GitHub, then run Alpha Hunter to find todays opportunities and send me an SMS summary"
  }'
```

Claude will:
1. Run `git status` to check for changes
2. If changes exist, run `git add -A`
3. Generate a commit message based on the changes
4. Run `git commit -m "..."`
5. Run `git push origin main`
6. Navigate to `apps/alpha-hunter`
7. Run the daily hunter
8. Send you an SMS with the results

**All without you lifting a finger! 🎉**

## Architecture

```
local-agent/
├── src/
│   ├── index.ts          # Main server & API routes
│   ├── executor.ts       # Command execution
│   ├── file-manager.ts   # File operations
│   ├── claude-comms.ts   # Claude API integration
│   ├── task-queue.ts     # Task management
│   ├── scheduler.ts      # Cron jobs
│   └── system-monitor.ts # System health
├── .env.example
├── package.json
└── README.md
```

## Security Notes

⚠️ This agent can execute ANY command on your machine. Only run it on trusted networks and never expose the port to the internet.

For production use:
- Add authentication to the API
- Use HTTPS
- Restrict to localhost only
- Set up firewall rules

---

**You are now out of the loop. The agent handles everything! 🤖**

