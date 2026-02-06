# 🧠 GUI Genius - Training Guide

## Overview

Local Agent has been trained to be a **genius** at using the GUI. It can:
- Understand natural language commands
- Execute operations via GUI
- Learn from successful operations
- Use AI (Claude) to enhance understanding
- Default to monorepo root for everything

## How It Works

### 1. **GUI Controller** (`gui-controller.ts`)
- Executes commands via GUI interface
- Always defaults to monorepo root: `C:\gcc\cevict-app\cevict-monorepo`
- Understands natural language instructions
- Maps instructions to GUI operations

### 2. **GUI Genius** (`gui-genius.ts`)
- AI-powered execution with learning
- Uses Claude to understand intent
- Learns from successful operations
- Builds knowledge base over time
- Gets smarter with each command

### 3. **API Routes** (`routes/gui.ts`)
- `/gui/execute` - Execute command via GUI
- `/gui/smart-execute` - Smart natural language execution
- `/gui/ai-execute` - **GENIUS MODE** - AI-powered with learning
- `/gui/navigate` - Navigate folders
- `/gui/read-file` - Read files
- `/gui/quick-action` - Execute quick actions
- `/gui/status` - Get GUI status
- `/gui/learnings` - View what it has learned

## Usage Examples

### From AI Assistant (You)

When you give a command, Local Agent will:

1. **Understand the intent** via AI
2. **Map to GUI operation** (command, file, quick-action)
3. **Execute via GUI** (defaults to monorepo root)
4. **Learn from result** (success/failure)
5. **Improve over time**

### Example Commands

**Natural Language:**
```
"Start the trading bot"
→ Executes: cd apps/alpha-hunter && pnpm run kalshi
→ Method: quick-action:start-trading
→ Defaults to: C:\gcc\cevict-app\cevict-monorepo
```

```
"Install dependencies in alpha-hunter"
→ Executes: cd apps/alpha-hunter && pnpm install
→ Method: command:execute
→ Defaults to: C:\gcc\cevict-app\cevict-monorepo
```

```
"Read the package.json file"
→ Reads: apps/alpha-hunter/package.json
→ Method: file:read
```

```
"Show me files in apps folder"
→ Lists: apps/ directory
→ Method: file:list
```

## Training Process

### Automatic Learning

Every time Local Agent executes a command:

1. **Records the instruction**
2. **Records the method used**
3. **Records success/failure**
4. **Updates knowledge base** (if successful)
5. **Improves future execution**

### Knowledge Base

Stores learned patterns:
- `start-trading` → `cd apps/alpha-hunter && pnpm run kalshi`
- `start-crypto` → `cd apps/alpha-hunter && pnpm run train`
- `install-deps` → `pnpm install`
- `git-status` → `git status`

### AI Enhancement

When Claude is available:
- Analyzes instruction intent
- Suggests best execution method
- Provides reasoning
- Learns from results

## API Endpoints

### Execute Command
```bash
POST http://localhost:3847/gui/execute
{
  "command": "pnpm install",
  "cwd": "C:\\gcc\\cevict-app\\cevict-monorepo"  # Optional, defaults to monorepo root
}
```

### Smart Execute (Natural Language)
```bash
POST http://localhost:3847/gui/smart-execute
{
  "instruction": "Start the trading bot"
}
```

### AI Execute (GENIUS MODE)
```bash
POST http://localhost:3847/gui/ai-execute
{
  "instruction": "Install dependencies and start the dashboard"
}
```

### View Learnings
```bash
GET http://localhost:3847/gui/learnings
```

Returns:
```json
{
  "learnings": {
    "total": 50,
    "successful": 45,
    "methods": {
      "quick-action:start-trading": 10,
      "command:execute": 30,
      "file:read": 5
    },
    "recent": [...]
  },
  "knowledge": {
    "default-cwd": "C:\\gcc\\cevict-app\\cevict-monorepo",
    "start-trading": "cd apps/alpha-hunter && pnpm run kalshi",
    ...
  }
}
```

## Key Features

### ✅ Always Defaults to Monorepo Root

**Every operation starts at:**
```
C:\gcc\cevict-app\cevict-monorepo
```

No need to navigate manually!

### ✅ Natural Language Understanding

Understands commands like:
- "Start trading"
- "Install dependencies"
- "Read package.json"
- "Show files in apps"
- "Navigate to alpha-hunter"

### ✅ Learning System

- Learns from every execution
- Builds knowledge base
- Gets smarter over time
- Remembers successful patterns

### ✅ AI Enhancement

- Uses Claude for complex instructions
- Provides reasoning
- Suggests best methods
- Learns from AI suggestions

## Integration with AI Assistant

When you (the AI assistant) give a command:

1. **You say:** "Start the trading bot"
2. **Local Agent receives:** Instruction via `/gui/ai-execute`
3. **GUI Genius analyzes:** Uses AI to understand intent
4. **Executes:** Via GUI (defaults to monorepo root)
5. **Learns:** Records success/failure
6. **Improves:** Gets better next time

## Best Practices

1. **Use natural language** - Local Agent understands it
2. **Trust the defaults** - Always starts at monorepo root
3. **Let it learn** - Each execution improves it
4. **Use AI mode** - `/gui/ai-execute` for complex tasks
5. **Check learnings** - See what it has learned

## Example Workflow

### You (AI Assistant):
"Start the trading bot and show me the recent trades"

### Local Agent (GUI Genius):
1. Understands: "start trading bot" → Quick action
2. Executes: `cd apps/alpha-hunter && pnpm run kalshi`
3. Understands: "show recent trades" → API call
4. Fetches: `/alpha-hunter/trades`
5. Returns: Trading data
6. Learns: Both operations successful

### Result:
- Trading bot started
- Recent trades displayed
- Knowledge updated
- Smarter for next time

---

**Local Agent is now a GUI Genius!** 🧠✨

It learns from every command and gets smarter with each execution!

