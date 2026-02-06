# 🎛️ Unified Command Center

A comprehensive command center for monitoring and controlling all projects in the CEVICT ecosystem.

## Features

### Per-Project Tabs
- **Alpha Hunter** 🤖 - Trading bot monitoring and control
- **Prognostication** 🔮 - Prediction market display
- **AI Orchestrator** 🎯 - Multi-AI coordination system
- **PROGNO** 📊 - Sports prediction engine
- **PetReunion** 🐾 - Lost pet finder
- **PopThePopcorn** 🍿 - Entertainment news aggregator
- **SmokersRights** 🚭 - Regulation monitor
- **Gulf Coast Charters** ⛵ - Charter booking platform
- **WhereToVacation** ✈️ - Travel aggregator

### Each Project Tab Includes:

#### 1. **Live Status Monitoring**
- Real-time health checks (healthy/degraded/down)
- Service status (running/stopped/error)
- Last check timestamp
- Port information

#### 2. **Project Controls**
- **Start** - Start the project service
- **Stop** - Stop the project service
- **Restart** - Restart the project service

#### 3. **AI Messaging**
- Send messages directly to AI inboxes (Claude/Gemini/Cursor)
- Automatic routing based on project assignment
- Messages are written to the appropriate inbox file
- Task ID generation for tracking

#### 4. **Live Logs Viewer**
- Real-time log streaming
- Color-coded log levels (info/warn/error/success)
- Timestamped entries
- Scrollable log history (last 100 entries)

## Access

Navigate to: `http://localhost:3010/command-center`

Or click the "🎛️ Command Center" button from the main monitor dashboard.

## API Endpoints

### Health Check
```
GET /api/command-center/health?url=http://localhost:3001/api/health
```
Checks if a service is running and healthy.

### Control
```
POST /api/command-center/control
{
  "projectId": "alpha-hunter",
  "action": "start" | "stop" | "restart"
}
```
Sends control commands to projects.

### AI Message
```
POST /api/command-center/ai-message
{
  "projectId": "alpha-hunter",
  "message": "Fix the trading bot error",
  "targetAI": "claude" // optional, defaults to project's assigned AIs
}
```
Sends messages to AI inboxes.

## Project to AI Mapping

- **Alpha Hunter**: Claude, Cursor
- **Prognostication**: Claude, Cursor
- **AI Orchestrator**: Claude, Cursor
- **PROGNO**: Claude
- **PetReunion**: Gemini, Cursor
- **PopThePopcorn**: Gemini, Cursor
- **SmokersRights**: Gemini, Cursor
- **Gulf Coast Charters**: Claude, Cursor
- **WhereToVacation**: Gemini, Cursor

## Inbox Integration

Messages are written to:
- `CURSOR-READY/INBOX/CLAUDE-INBOX.md`
- `CURSOR-READY/INBOX/GEMINI-INBOX.md`
- `CURSOR-READY/INBOX/CURSOR-INBOX.md`

Each message includes:
- Task ID (format: `AI-CURSOR-YYYYMMDD-HHMM`)
- Timestamp
- Project context
- Priority level
- Status tracking

## Control Commands

Currently, control commands are queued but require integration with:
- **PM2** (process manager)
- **Docker** (container management)
- **Systemd** (Linux services)
- **Windows Services** (Windows)

To enable actual command execution, update `/api/command-center/control/route.ts` to integrate with your process manager.

## Future Enhancements

- [ ] Real-time log streaming via WebSocket
- [ ] Command execution history
- [ ] Project metrics dashboard
- [ ] Alert notifications
- [ ] Multi-environment support (dev/staging/prod)
- [ ] SSH/remote execution support
- [ ] Resource usage monitoring (CPU, memory, disk)

## Development

```bash
cd apps/monitor
pnpm install
pnpm dev
# Access at http://localhost:3010/command-center
```

## Notes

- Health checks run every 10 seconds automatically
- Logs are kept in memory (last 100 entries per project)
- AI messages are appended to inbox files (not overwritten)
- Control commands require process manager integration for actual execution

