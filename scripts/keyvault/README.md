# KeyVault — Keystore Commands

Central store for env/secrets (e.g. `C:\Cevict_Vault\env-store.json` or repo `vault\secrets\env-store.json`). Scripts read/write the store and sync to app `.env.local` via `env.manifest.json`. Override with `$env:KEYVAULT_STORE_PATH` if needed.

---

## Commands (brief)

| Script | Description |
|--------|-------------|
| **init-store.ps1** | Create a new store from the example JSON. Use `-StorePath` or default from module; **`-Force` wipes all existing secrets** (see below). |
| **set-secret.ps1** | Save one secret: `-Name KEY -Value "value"`. Creates/updates in store. |
| **doctor.ps1** | Check one app’s **required** manifest vars against the store. Fails if any required key is missing. `-AppPath .\apps\monitor` |
| **list-missing-keys.ps1** | List manifest vars that have **no** value in the store (all vars, not just required). Optional `-AppPath`, `-ShowValues` to print values. Default apps: monitor, launchpad, moltbook-viewer, petreunion, progno. |
| **sync-env.ps1** | Write app `.env.local` from store using `env.manifest.json`. `-AppPath .\apps\petreunion` or `-All` for all apps under `apps/` that have an `env.manifest.json` (includes accu-solar, praxis, etc.). `-DryRun` / `-IncludeMissingOptional` / `-AllowMissingRequired`. |
| **import-from-env.ps1** | One-time import: read `KEY=value` from `.env*` files and merge into the store. Default paths include repo root and several apps; or `-Paths "path1","path2"`. `-Overwrite` updates existing keys; `-DryRun` only reports. |
| **import-from-env-keys-list.ps1** | Import keys listed in a file (e.g. `env-keys-sorted.txt`: `KEY \t HAS_VALUE \t FILE(S)`). For each key with a value, reads from preferred source file and writes to store. `-InputFile`, `-Overwrite`, `-DryRun`. |
| **extract-env-keys.ps1** | List env key names parsed from given `.env.example` (or default) files. No secrets; key names only. `-Paths "path1","path2"`. |
| **find-placeholders.ps1** | Find store keys whose values look like placeholders (e.g. `your-*`, `*_here`). `-ListAll` lists every key and placeholder status. |
| **scan-env-files.ps1** | Scan repo for `.env*` files and list which keys they reference; does not print secret values. `-RepoRoot`, `-IncludeBackups`, `-ReportPlaceholdersInStore`. |
| **push-vercel.ps1** | Push store secrets to Vercel env for an app. `-App` (required), `-Env development|preview|production`, **`-AllEnvs`** pushes to all three at once, `-TargetsPath`, `-DryRun`. Uses `config/keyvault.targets.json` (or example) for app→project mapping. |
| **verify-vercel.ps1** | Compare keyvault store against what's actually set in Vercel for an app. `-App` (required), `-Env production|preview|development`. Shows matched, mismatched, and missing vars. |
| **status.ps1** | Dashboard view of keyvault health: total secrets, placeholders, empty values, configured apps, manifest status. `-Verbose` shows per-app env var coverage, `-ShowValues` prints truncated secret values. |

---

## Module (KeyVault.psm1)

- **Get-KeyVaultRepoRoot** — Repo root (parent of `scripts`).
- **Get-KeyVaultStorePath** — Store file path (`KEYVAULT_STORE_PATH` or `C:\Cevict_Vault\env-store.json` or repo `vault\secrets\env-store.json`).
- **Get-KeyVaultStore** / **Save-KeyVaultStore** — Load/save store JSON.
- **Get-KeyVaultSecret** / **Set-KeyVaultSecret** — Read/write one secret by name.
- **Resolve-KeyVaultVarValue** — Resolve a manifest var (from/fromAny) to a value from the store.
- **Sync-KeyVaultEnvFromManifest** / **Sync-KeyVaultAllApps** — Generate `.env.local` from manifest (used by sync-env.ps1).

---

## Quick usage

```powershell
cd C:\cevict-live\scripts\keyvault

# Create store (once)
.\init-store.ps1 -StorePath "C:\Cevict_Vault\env-store.json"

# Check what keys are in the store (view all)
$store = Get-Content 'C:\Cevict_Vault\env-store.json' | ConvertFrom-Json
$store.secrets | ConvertTo-Json -Depth 5

# Check if a specific key exists
$store.secrets.API_SPORTS_KEY  # Returns value or blank if not set
$store.secrets.POLYMARKET_API_KEY

# Set a secret
.\set-secret.ps1 -Name SINCH_API_TOKEN -Value "your-token"

# Update an existing secret (just set it again)
.\set-secret.ps1 -Name API_SPORTS_KEY -Value "your-new-key"

# Check one app (required keys only)
.\doctor.ps1 -AppPath ..\..\apps\monitor

# List all missing keys (any app with manifest)
.\list-missing-keys.ps1
.\list-missing-keys.ps1 -ShowValues

# Sync app env from store (writes .env.local)
.\sync-env.ps1 -AppPath ..\..\apps\petreunion
.\sync-env.ps1 -All
```

## Common KeyVault Tasks

### Check if a key exists in the store
```powershell
cd C:\cevict-live\scripts\keyvault

# Method 1: Direct JSON read (quickest)
$store = Get-Content 'C:\Cevict_Vault\env-store.json' | ConvertFrom-Json
$store.secrets.API_SPORTS_KEY        # Shows value or blank
$store.secrets.POLYMARKET_API_KEY     # Shows value or blank

# Method 2: List all secrets
$store.secrets | Format-List

# Method 3: Check for specific pattern
$store.secrets.PSObject.Properties | Where-Object { $_.Name -like '*POLY*' }
```

### Add or update a key
```powershell
cd C:\cevict-live\scripts\keyvault

# Set a new key or update existing
.\set-secret.ps1 -Name API_SPORTS_KEY -Value "569e365fcb04b201ead4055ec8b359a9"

# Set Polymarket keys (for trading)
.\set-secret.ps1 -Name POLYMARKET_API_KEY -Value "your-api-key"
.\set-secret.ps1 -Name POLYMARKET_WALLET -Value "your-wallet-address"
.\set-secret.ps1 -Name POLYMARKET_PRIVATE_KEY -Value "your-private-key"

# Sync to update .env.local files
.\sync-env.ps1 -All
```

Store format: JSON with top-level `secrets` object (key → string value). Optional `version`, `updated_at`.

---

## Monitor Supabase (keystore only)

Monitor’s `.env.local` is generated by sync; do not edit it by hand or your values will be overwritten. Add Supabase keys to the keystore, then sync.

**Keystore key names** (from `apps/monitor/env.manifest.json`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Project URLs (for reference):**

- Production: `https://rdbuwyefbgnbuhmjrizo.supabase.co`
- Test/Free: `https://nqkbqtiramecvmmpaxzk.supabase.co`

Get the **anon** and **service_role** keys from Supabase Dashboard → Project Settings → API for the project you use.

**Add to keystore and sync:**

```powershell
cd C:\cevict-live\scripts\keyvault

# Set each (replace with your real values from Supabase Dashboard → API)
.\set-secret.ps1 -Name NEXT_PUBLIC_SUPABASE_URL -Value "https://rdbuwyefbgnbuhmjrizo.supabase.co"
.\set-secret.ps1 -Name NEXT_PUBLIC_SUPABASE_ANON_KEY -Value "eyJ..."
.\set-secret.ps1 -Name SUPABASE_SERVICE_ROLE_KEY -Value "eyJ..."

# Write apps/monitor/.env.local from store
.\sync-env.ps1 -AppPath ..\..\apps\monitor
```

Then restart the monitor app so it picks up the new env.

---

## Kalshi API Key Management

Kalshi uses RSA-PSS signed requests. The private key lives in the vault; the public key is registered on the Kalshi dashboard. They must be a matched pair.

### Check current key status
```powershell
cd C:\cevict-live\scripts\keyvault
$store = Get-Content 'C:\Cevict_Vault\env-store.json' | ConvertFrom-Json
$store.secrets.KALSHI_API_KEY_ID   # current key ID
$store.secrets.KALSHI_BASE_URL     # should be https://api.elections.kalshi.com/trade-api/v2
```

### Rotate / fix Kalshi keys (when auth fails)

If `kalshi-sell-losers.ps1` returns `INCORRECT_API_KEY_SIGNATURE` or `NOT_FOUND`, the vault private key doesn't match what's registered on Kalshi. Fix:

```powershell
# Step 1 — Generate a fresh RSA-2048 key pair (saves private key to vault automatically)
pwsh -NoProfile -File C:\cevict-live\_tmp_gen_kalshi_key.ps1
# (or run the inline block below)

# Inline key generation:
$rsa = [System.Security.Cryptography.RSA]::Create(2048)
$privB64 = [Convert]::ToBase64String($rsa.ExportRSAPrivateKey())
$wrapped = ($privB64 -split '(.{64})' | Where-Object { $_ }) -join "`n"
$privPem = "-----BEGIN RSA PRIVATE KEY-----`n$wrapped`n-----END RSA PRIVATE KEY-----"
$pubB64  = [Convert]::ToBase64String($rsa.ExportSubjectPublicKeyInfo())
$wrappedPub = ($pubB64 -split '(.{64})' | Where-Object { $_ }) -join "`n"
$pubPem  = "-----BEGIN PUBLIC KEY-----`n$wrappedPub`n-----END PUBLIC KEY-----"
$rsa.Dispose()
Write-Host $pubPem   # <-- copy this

# Step 2 — Save private key to vault
.\set-secret.ps1 -Name KALSHI_PRIVATE_KEY -Value $privPem

# Step 3 — Upload public key to Kalshi dashboard
# Go to: https://kalshi.com/account/api-keys
# Click "Add API Key" → paste the PUBLIC KEY output from step 1
# Copy the new Key ID Kalshi assigns

# Step 4 — Save new Key ID to vault
.\set-secret.ps1 -Name KALSHI_API_KEY_ID -Value "<paste-new-key-id-here>"

# Step 5 — Test
pwsh -NoProfile -File C:\cevict-live\scripts\kalshi-sell-losers.ps1 -DryRun
```

### Vault keys used by kalshi-sell-losers.ps1
| Key | Description |
|-----|-------------|
| `KALSHI_API_KEY_ID` | UUID from Kalshi dashboard (must match uploaded public key) |
| `KALSHI_PRIVATE_KEY` | RSA PKCS#1 PEM — must be the private half of the registered public key |
| `KALSHI_BASE_URL` | `https://api.elections.kalshi.com/trade-api/v2` |

The sell script reads all three automatically from `C:\Cevict_Vault\env-store.json` — no hardcoded credentials.

---

## Cochran AI task runner (COCHRAN_TASKS.json)

Cochran reads the **same KeyVault store** when running tasks (e.g. Supabase migrations). Add these keys via the keystore so he can run in test or prod; do **not** rely only on app `.env.local` (Cochran merges keyvault first, then `.env.local` overrides).

**Keystore key names for Cochran:**

- **`COCHRAN_RUN_MODE`** — `test` or `prod`. Defaults to `test` if unset.
- **`SUPABASE_PROJECT_REF_<ENV>`** — Supabase project ref for each task’s `env`.
  Examples:
  - Accu-Solar: `SUPABASE_PROJECT_REF_SUPABASE_ACCU_SOLAR` = your Accu-Solar Pro project ref (e.g. `rdbuwyefbgnbuhmjrizo`).
  - WTV test: `SUPABASE_PROJECT_REF_SUPABASE_WTV_TEST` = your WTV test project ref.

**Add to keystore:**

```powershell
cd C:\cevict-live\scripts\keyvault

# Accu-Solar (Pro)
.\set-secret.ps1 -Name COCHRAN_RUN_MODE -Value "prod"
.\set-secret.ps1 -Name SUPABASE_PROJECT_REF_SUPABASE_ACCU_SOLAR -Value "rdbuwyefbgnbuhmjrizo"

# WTV (test)
.\set-secret.ps1 -Name SUPABASE_PROJECT_REF_SUPABASE_WTV_TEST -Value "<your-wtv-test-ref>"
```

No need to run sync-env for Cochran; he reads the store directly. Override with `KEYVAULT_STORE_PATH` if your store lives elsewhere.

---

## Progno (The Odds API)

Progno uses **Key Vault** as the source of truth for Odds API keys. Do not edit `apps/progno/.env.local` by hand; it is generated by `sync-env.ps1` from the store. Add or update keys in the store, then sync.

### Store keys (from `apps/progno/env.manifest.json`)

| Key | Description |
|-----|-------------|
| `ODDS_API_KEY` | Primary The-Odds-API key (the-odds-api.com). |
| `ODDS_API_KEY_2` | Secondary key for rotation or fallback when primary quota is exhausted. |
| `USE_ODDS_FALLBACK_KEY` | Set to `1` to use `ODDS_API_KEY_2` instead of `ODDS_API_KEY` until you clear it (e.g. next morning after quota resets). |

### Add or update Odds API keys

```powershell
cd C:\cevict-live\scripts\keyvault

# Primary and fallback keys (get from the-odds-api.com)
.\set-secret.ps1 -Name ODDS_API_KEY -Value "your-primary-key"
.\set-secret.ps1 -Name ODDS_API_KEY_2 -Value "your-fallback-key"

# Use fallback key until tomorrow (e.g. primary quota exhausted)
.\set-secret.ps1 -Name USE_ODDS_FALLBACK_KEY -Value "1"

# Sync so Progno gets the values
.\sync-env.ps1 -AppPath ..\..\apps\progno
```

Restart the Progno dev server (or redeploy) so it picks up the new env.

### Switch back to primary key

When the primary key’s quota is available again (e.g. next morning), clear the fallback flag:

```powershell
.\set-secret.ps1 -Name USE_ODDS_FALLBACK_KEY -Value ""
.\sync-env.ps1 -AppPath ..\..\apps\progno
```

Or remove the key from the store and sync again.

---

## Alpha Hunter (risk limits)

Alpha Hunter’s `.env.local` is generated by sync; do not edit it by hand or your values will be overwritten. Add risk-limit keys to the store, then sync.

### Store keys (from `apps/alpha-hunter/env.manifest.json`)

| Key | Description |
|-----|-------------|
| `MAX_DAILY_SPEND` | Max total $ you can stake on trades per day (spending cap). |
| `MAX_DAILY_LOSS` | Max acceptable loss (P&L) per day; stop when daily loss exceeds this. |

### Add or update risk limits, then push out

```powershell
cd C:\cevict-live\scripts\keyvault

# Add to keyvault (use your desired values)
.\set-secret.ps1 -Name MAX_DAILY_SPEND -Value "500"
.\set-secret.ps1 -Name MAX_DAILY_LOSS -Value "250"

# Push out to apps/alpha-hunter/.env.local
.\sync-env.ps1 -AppPath ..\..\apps\alpha-hunter
```

Restart Alpha Hunter so it picks up the new env.

---

## Sportsbook Terminal

Sportsbook Terminal’s `.env.local` is generated by sync; do not edit it by hand. Add keys to the store, then sync.

### Store keys (from `apps/sportsbook-terminal/env.manifest.json`)

| Key | Description |
|-----|-------------|
| `SUPABASE_URL` | Supabase project URL (required). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (required). |
| `PROGNO_URL` | Prognostication API base (e.g. `https://prognostication.com` or `http://localhost:3005`). |
| `PROGNO_INTERNAL_API_KEY` | Mapped to `PROGNO_API_KEY` in app; API key for Prognostication. |
| `CORS_ORIGINS` | Optional. Comma-separated allowed origins; default from `FRONTEND_URL` (e.g. `http://localhost:3433`). |

### Add or update, then push out

```powershell
cd C:\cevict-live\scripts\keyvault

# Required (if not already in store): Supabase + PROGNO_*
# Optional CORS:
.\set-secret.ps1 -Name CORS_ORIGINS -Value "http://localhost:3433"

# Push out to apps/sportsbook-terminal/.env.local
.\sync-env.ps1 -AppPath ..\..\apps\sportsbook-terminal
```

Restart Sportsbook Terminal (e.g. `node server.js`) to pick up changes.
