# 🎯 Setup Kalshi via Local Agent

## Quick Command

```bash
cd C:\gcc\cevict-app\cevict-monorepo\apps\alpha-hunter
pnpm run setup-kalshi
```

## What This Does

The script will:
1. ✅ Scan the repository for existing Kalshi configuration
2. ✅ Check `.env.local` for existing credentials
3. ✅ Read `.env.example` for template
4. ✅ Send configuration to Local Agent (if running)
5. ✅ Create/update `.env.local` file
6. ✅ Install dependencies via Local Agent
7. ✅ Test Kalshi connection

## Prerequisites

### Option 1: Local Agent Running (Recommended)
```bash
# In a separate terminal, start Local Agent:
cd C:\gcc\cevict-app\cevict-monorepo\apps\local-agent
pnpm dev
```

### Option 2: Manual Setup (If Local Agent Not Running)
The script will still work, but you'll need to manually:
1. Edit `.env.local` with your credentials
2. Run `pnpm install`
3. Run `pnpm run test`

## Required Kalshi Information

The script looks for these in your repo:

### From `.env.local`:
- `KALSHI_API_KEY_ID` - Your Kalshi API key ID
- `KALSHI_PRIVATE_KEY` - Your Kalshi private key (with `\n` for newlines)
- `KALSHI_ENV` - `demo` or `production`
- `ANTHROPIC_API_KEY` - Claude API key for AI analysis
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### From Documentation:
- `KALSHI_START_GUIDE.md` - Setup instructions
- `.env.example` - Configuration template

## Complete Setup Process

### Step 1: Ensure Local Agent is Running

```bash
# Check if Local Agent is running
curl http://localhost:3847/health

# If not running, start it:
cd C:\gcc\cevict-app\cevict-monorepo\apps\local-agent
pnpm dev
```

### Step 2: Run Setup Script

```bash
cd C:\gcc\cevict-app\cevict-monorepo\apps\alpha-hunter
pnpm run setup-kalshi
```

### Step 3: Verify Configuration

The script will:
- ✅ Create/update `.env.local`
- ✅ Install dependencies
- ✅ Test connection

### Step 4: Add Missing Credentials

If any credentials are missing, edit `.env.local`:

```bash
notepad .env.local
```

Add:
```env
KALSHI_API_KEY_ID=your_key_id
KALSHI_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----
KALSHI_ENV=demo
ANTHROPIC_API_KEY=sk-ant-your-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ-your-key
```

### Step 5: Start Kalshi

```bash
pnpm run kalshi
```

## Manual Alternative (Without Local Agent)

If Local Agent is not available:

```bash
# 1. Navigate to directory
cd C:\gcc\cevict-app\cevict-monorepo\apps\alpha-hunter

# 2. Copy example env file
copy .env.example .env.local

# 3. Edit with your credentials
notepad .env.local

# 4. Install dependencies
pnpm install

# 5. Test connection
pnpm run test

# 6. Start Kalshi
pnpm run kalshi
```

## What the Script Scans

The setup script automatically finds:

1. **Existing Configuration** (`.env.local`)
   - Kalshi API credentials
   - Environment settings
   - Required API keys

2. **Documentation** (`KALSHI_START_GUIDE.md`)
   - Setup instructions
   - Configuration examples

3. **Templates** (`.env.example`)
   - Configuration template
   - All available options

## Troubleshooting

### "Local Agent not running"
```bash
# Start Local Agent first:
cd C:\gcc\cevict-app\cevict-monorepo\apps\local-agent
pnpm dev
```

### "Missing credentials"
- The script will create `.env.local` with placeholders
- Edit it manually to add your actual credentials

### "Dependencies failed"
```bash
# Install manually:
pnpm install
```

### "Test failed"
- Check that all required environment variables are set
- Verify API keys are correct
- Check internet connection

## Files Created/Modified

- ✅ `.env.local` - Created/updated with Kalshi configuration
- ✅ `node_modules/` - Dependencies installed
- ✅ Logs output to console

## Next Steps After Setup

1. **Verify Setup:**
   ```bash
   pnpm run test
   ```

2. **Start Trading:**
   ```bash
   pnpm run kalshi
   ```

3. **Monitor Performance:**
   ```bash
   pnpm run report
   ```

4. **Check Status:**
   ```bash
   pnpm start status
   ```

---

**Ready? Run: `pnpm run setup-kalshi`** 🚀

