# KeyVault & Scripts — How to Use

Scripts under `scripts\` and `scripts\keyvault\` manage env secrets and generate `.env.local` (and other env files) from a single store. You can keep that store in **C:\Cevict_Vault** so secrets never live in the repo.

---

## Recommended workflow (human-proof)

**Do not edit `.env.local` by hand.** Treat it as generated output.

1. **Add or change a secret** → Edit `C:\Cevict_Vault\env-store.json` (or run `set-secret.ps1`).
2. **Regenerate env files** → Run `.\scripts\keyvault\sync-env.ps1 -All` (or `-AppPath .\apps\<app>` for one app).

One source of truth (the store), no copy-paste into app folders, no drift. The generated files have a "DO NOT EDIT BY HAND" header as a reminder.

---

## 1. Where secrets live (the store)

- **Default in-repo:** `C:\cevict-live\vault\secrets\env-store.json`
- **Recommended (off-repo):** `C:\Cevict_Vault\env-store.json`

KeyVault looks for the store in this order:

1. **Env override:** if `KEYVAULT_STORE_PATH` is set (e.g. `C:\Cevict_Vault\env-store.json`), that file is used.
2. **Cevict_Vault:** then it checks `C:\Cevict_Vault\env-store.json` (and a few path variants there).
3. **Repo:** otherwise `vault\secrets\env-store.json` under the repo.

So: **to use C:\Cevict_Vault**, either:

- Put your store at `C:\Cevict_Vault\env-store.json`, **or**
- Set once (e.g. in your profile or a small launcher):
  ```powershell
  $env:KEYVAULT_STORE_PATH = "C:\Cevict_Vault\env-store.json"
  ```

Store format (JSON):

```json
{
  "version": 1,
  "updated_at": "2026-02-05T12:00:00Z",
  "secrets": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://xxx.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJ...",
    "STRIPE_SECRET_KEY": "sk_...",
    ...
  }
}
```

All keys your apps need go in `secrets`. No secrets are committed if the store is only in `C:\Cevict_Vault`.

---

## 2. One-time import from existing .env files

To **seed the store** from your current `.env` / `.env.local` files (so you don’t retype everything):

```powershell
# Optional: point at Cevict_Vault first so the store is created there
$env:KEYVAULT_STORE_PATH = "C:\Cevict_Vault\env-store.json"
New-Item -ItemType Directory -Path "C:\Cevict_Vault" -Force

# Create empty store if it doesn’t exist, then import from default app .env paths
.\scripts\keyvault\import-from-env.ps1

# Or specify files
.\scripts\keyvault\import-from-env.ps1 -Paths "C:\cevict-live\apps\progno\.env.local","C:\cevict-live\apps\prognostication\.env.local"

# Preview only
.\scripts\keyvault\import-from-env.ps1 -DryRun

# Overwrite keys that are already in the store (default is add-only, skip existing)
.\scripts\keyvault\import-from-env.ps1 -Overwrite
```

Default paths: repo `.env`, `.env.local`, and `apps\progno`, `apps\prognostication`, `apps\gulfcoastcharters`, `apps\wheretovacation`, `apps\alpha-hunter` `.env.local`. After import, fix any gaps or mistakes in the store by hand or with `set-secret.ps1`.

---

## 3. Creating or resetting the store (empty template)

From repo root:

```powershell
# Use default store path (repo vault or Cevict_Vault if present)
.\scripts\keyvault\init-store.ps1

# Or force a specific path (e.g. Cevict_Vault)
.\scripts\keyvault\init-store.ps1 -StorePath "C:\Cevict_Vault\env-store.json"

# Overwrite existing store (careful)
.\scripts\keyvault\init-store.ps1 -StorePath "C:\Cevict_Vault\env-store.json" -Force
```

This copies from `config\env-store.example.json` (or `docs\keyvault\env-store.example.json` if present). Then edit the file and fill in real values.

---

## 4. Generating .env.local from the store

Each app that uses KeyVault has an **env manifest**: `apps\<app>\env.manifest.json`. It lists which env file to generate (e.g. `.env.local`) and which store keys map to which variable names.

**One app:**

```powershell
.\scripts\keyvault\sync-env.ps1 -AppPath "C:\cevict-live\apps\prognostication"
# or relative from repo root:
.\scripts\keyvault\sync-env.ps1 -AppPath ".\apps\prognostication"
```

**All apps** that have `env.manifest.json`:

```powershell
.\scripts\keyvault\sync-env.ps1 -All
```

**Preview only (no files written):**

```powershell
.\scripts\keyvault\sync-env.ps1 -AppPath ".\apps\prognostication" -DryRun
.\scripts\keyvault\sync-env.ps1 -All -DryRun
```

**Optional:** `-IncludeMissingOptional` adds commented lines for optional keys that are missing; `-AllowMissingRequired` lets the run succeed even if a required key is missing (writes a comment for it).

So: **store everything in C:\Cevict_Vault (or set KEYVAULT_STORE_PATH), then run sync-env to generate/refresh .env.local** whenever you want.

---

## 5. Adding or updating a single secret

```powershell
.\scripts\keyvault\set-secret.ps1 -Name "STRIPE_SECRET_KEY" -Value "sk_live_..."
```

Uses the same store path (Cevict_Vault or default). Good for one-off updates without editing JSON by hand.

---

## 6. Checking that the store and app are OK

```powershell
.\scripts\keyvault\doctor.ps1
.\scripts\keyvault\doctor.ps1 -AppPath ".\apps\prognostication"
```

First checks that the store file exists and has valid JSON and a `secrets` object. With `-AppPath`, also checks that every **required** variable in that app’s manifest has a value in the store.

---

## 7. Manifest format (env.manifest.json)

Each app’s `env.manifest.json` describes what to generate. Example:

```json
{
  "app": "prognostication",
  "outputs": [
    {
      "file": ".env.local",
      "vars": {
        "NEXT_PUBLIC_SUPABASE_URL": {
          "fromAny": ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"],
          "required": true
        },
        "STRIPE_SECRET_KEY": { "from": "STRIPE_SECRET_KEY", "required": true },
        "PROGNO_BASE_URL": { "from": "PROGNO_BASE_URL", "required": false }
      }
    }
  ]
}
```

- **file:** path relative to the app folder (e.g. `.env.local`).
- **vars:** map of **output variable name** → spec:
  - **from:** one store key.
  - **fromAny:** list of store keys; first non-empty value wins.
  - **required:** if true and no value is found, sync fails (unless `-AllowMissingRequired`).
  - **literal:** fixed string (no store lookup).

The generated file gets a header like “Generated by KeyVault. DO NOT EDIT BY HAND.” Regenerating overwrites it, so keep edits in the store and manifest, not in the generated file.

---

## 8. Pushing env to Vercel

```powershell
.\scripts\keyvault\push-vercel.ps1 -App "prognostication" -Env production
```

Reads the same store and the app’s manifest, plus `config\keyvault.targets.json` (or `config\keyvault.targets.example.json`) for Vercel project/team IDs. Sends the resolved vars to Vercel. Requires `VERCEL_TOKEN` (and optionally `VERCEL_TEAM_ID`) in the store. Copy `config\keyvault.targets.example.json` to `config\keyvault.targets.json` and fill in project IDs.

---

## 9. Other scripts in scripts\

| Script | Purpose |
|--------|--------|
| **collect-env-keys.ps1** | Scans all `.env*` under the repo, outputs sorted key list to `env-keys-sorted.txt` (or custom path). Optional `-IncludeValues` (masks sensitive keys). |
| **sync-env-keys-to-apps.ps1** | Syncs a set of env keys from existing .env files into app `.env.local` (different from KeyVault: source is other .env files, not the vault store). |
| **sync-prognostication-env.ps1** | Copies a fixed list of prognostication keys from other apps’ .env files into `apps\prognostication\.env.local` (add-only, backup first). |
| **update-supabase-env-vars.ps1** | Updates Supabase project env vars (separate from KeyVault). |
| **verify-liquidity.ps1** / **verify-real-data.ps1** | Project-specific verification scripts. |

---

## Quick “I use C:\Cevict_Vault” workflow

1. **One-time:** Create store and import from existing .env files:
   ```powershell
   New-Item -ItemType Directory -Path "C:\Cevict_Vault" -Force
   $env:KEYVAULT_STORE_PATH = "C:\Cevict_Vault\env-store.json"
   .\scripts\keyvault\init-store.ps1 -StorePath "C:\Cevict_Vault\env-store.json"
   .\scripts\keyvault\import-from-env.ps1
   # Fix any missing keys in C:\Cevict_Vault\env-store.json (or use set-secret.ps1)
   ```

2. **Whenever you want a new/updated .env.local:**
   ```powershell
   $env:KEYVAULT_STORE_PATH = "C:\Cevict_Vault\env-store.json"  # if not permanent
   .\scripts\keyvault\sync-env.ps1 -AppPath ".\apps\prognostication"
   # or for all apps:
   .\scripts\keyvault\sync-env.ps1 -All
   ```

3. **Optional:** Add a secret without opening the file:
   ```powershell
   .\scripts\keyvault\set-secret.ps1 -Name "SOME_KEY" -Value "secret"
   ```

That’s it: **one store in C:\Cevict_Vault, manifests in each app, sync-env pulls keys and generates .env.local (or other env files) on demand.**
