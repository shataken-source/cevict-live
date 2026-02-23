# Local AI Setup for Alpha-Hunter

## Why Use Local AI?

Replace Claude API (costs money) with **free local AI models** for crypto analysis.

## Option 1: Ollama (Recommended - Easiest)

### Install Ollama
1. Download: https://ollama.ai/download
2. Install for Windows
3. Open terminal and run:
   ```bash
   ollama run llama3.2:3b
   ```

### Configure Alpha-Hunter
Edit `.env.local`:
```env
USE_LOCAL_AI=true
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

### Available Models
- `llama3.2:3b` - Fast, 2GB RAM (recommended)
- `llama3.2:1b` - Faster, 1GB RAM (lower quality)
- `mistral:7b` - Better quality, 4GB RAM
- `phi3:mini` - Microsoft, 2GB RAM

To switch models:
```bash
ollama pull mistral:7b
```
Then update `OLLAMA_MODEL=mistral:7b` in `.env.local`

## Option 2: LM Studio (GUI Alternative)

1. Download: https://lmstudio.ai
2. Install and launch
3. Download a model (Llama 3.2 3B recommended)
4. Start local server (default port 1234)
5. Configure `.env.local`:
   ```env
   USE_LOCAL_AI=true
   OLLAMA_URL=http://localhost:1234/v1
   OLLAMA_MODEL=llama-3.2-3b
   ```

## Option 3: OpenClaw (Advanced)

OpenClaw can use local models but requires more setup:
1. Install OpenClaw
2. Configure with local model backend
3. Start gateway on port 18789
4. Clawbot-GUI can connect to it

**Note:** OpenClaw is overkill for simple crypto analysis. Use Ollama instead.

## Testing Local AI

Run test script:
```bash
cd apps/alpha-hunter
tsx test-local-ai.ts
```

## Performance Comparison

| AI | Speed | Quality | Cost | RAM |
|----|-------|---------|------|-----|
| Claude API | Fast | Excellent | $$ | 0 |
| Ollama (llama3.2:3b) | Medium | Good | Free | 2GB |
| Ollama (mistral:7b) | Slow | Very Good | Free | 4GB |
| Basic Momentum | Instant | Fair | Free | 0 |

## Fallback Chain

Alpha-Hunter tries in order:
1. **Claude API** (if ANTHROPIC_API_KEY set)
2. **Local AI** (if USE_LOCAL_AI=true and Ollama running)
3. **Basic Momentum** (always available)

## Current Status

Your setup:
- Claude: ❌ 401 error (auth issue)
- Local AI: ⚠️ Disabled (set USE_LOCAL_AI=true)
- Momentum: ✅ Working (basic fallback)

## Recommendation

**Install Ollama now:**
```bash
# 1. Download and install Ollama
# 2. Run this command:
ollama run llama3.2:3b

# 3. Edit .env.local:
USE_LOCAL_AI=true

# 4. Restart crypto trainer:
npm run train
```

You'll get AI-powered analysis for **free** without needing Claude API credits.
