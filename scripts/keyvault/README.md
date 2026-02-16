# KeyVault — Keystore Commands

Central store for env/secrets (e.g. `C:\Cevict_Vault\env-store.json` or repo `vault\secrets\env-store.json`). Scripts read/write the store and sync to app `.env.local` via `env.manifest.json`. Override with `$env:KEYVAULT_STORE_PATH` if needed.

---

## Commands (brief)

| Script | Description |
|--------|-------------|
| **init-store.ps1** | Create a new store from the example JSON. Use `-StorePath` or default from module; **`-Force` wipes all existing secrets** (see below). |
| **set-secret.ps1** | Save one secret: `-Name KEY -Value "value"`. Creates/updates in store. |
| **doctor.ps1** | Check one app’s **required** manifest vars against the store. Fails if any required key is missing. `-AppPath .\apps\monitor` |
| **list-missing-keys.ps1** | List manifest vars that have **no** value in the store (all vars, not just required). Optional `-AppPath`, `-ShowValues` to print values. Default apps: monitor, launchpad, moltbook-viewer, petreunion. |
| **sync-env.ps1** | Write app `.env.local` from store using `env.manifest.json`. `-AppPath .\apps\petreunion` or `-All` for all apps under `apps/` that have an `env.manifest.json` (includes accu-solar, praxis, etc.). `-DryRun` / `-IncludeMissingOptional` / `-AllowMissingRequired`. |
| **import-from-env.ps1** | One-time import: read `KEY=value` from `.env*` files and merge into the store. Default paths include repo root and several apps; or `-Paths "path1","path2"`. `-Overwrite` updates existing keys; `-DryRun` only reports. |
| **import-from-env-keys-list.ps1** | Import keys listed in a file (e.g. `env-keys-sorted.txt`: `KEY \t HAS_VALUE \t FILE(S)`). For each key with a value, reads from preferred source file and writes to store. `-InputFile`, `-Overwrite`, `-DryRun`. |
| **extract-env-keys.ps1** | List env key names parsed from given `.env.example` (or default) files. No secrets; key names only. `-Paths "path1","path2"`. |
| **find-placeholders.ps1** | Find store keys whose values look like placeholders (e.g. `your-*`, `*_here`). `-ListAll` lists every key and placeholder status. |
| **scan-env-files.ps1** | Scan repo for `.env*` files and list which keys they reference; does not print secret values. `-RepoRoot`, `-IncludeBackups`, `-ReportPlaceholdersInStore`. |
| **push-vercel.ps1** | Push store secrets to Vercel env for an app. `-App` (required), `-Env development|preview|production`, `-TargetsPath`, `-DryRun`. Uses `config/keyvault.targets.json` (or example) for app→project mapping. |

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
