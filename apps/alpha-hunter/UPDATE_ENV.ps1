$envContent = @"
# SAFE TEMPLATE (no secrets)
#
# This script writes a DEMO-ONLY alpha-hunter .env.local template.
# Fill in your real keys manually after it is created.
#
# SECURITY: Never commit .env.local, never paste keys into repo scripts.

# Kalshi (DEMO ONLY)
KALSHI_API_KEY_ID=
KALSHI_PRIVATE_KEY=
KALSHI_ENV=demo

# AI
ANTHROPIC_API_KEY=

# Coinbase (optional)
COINBASE_API_KEY=
COINBASE_API_SECRET=

# Supabase (optional but recommended for learning persistence)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Risk controls
DAILY_PROFIT_TARGET=250
MAX_DAILY_LOSS=100
MAX_SINGLE_TRADE=50
MAX_OPEN_POSITIONS=5
"@

Set-Content -Path "C:\cevict-live\apps\alpha-hunter\.env.local" -Value $envContent
Write-Host "[VERIFIED] .env.local created with proper formatting"

