# Why KeyVault "broke" and when

## When

**Commit 52f6aa4** — **Feb 6, 2026** — "chore: sync uncommitted work across apps"

That commit changed `Get-KeyVaultStorePath` in `KeyVault.psm1`.

## Before (Jan 19, 2026 – ba863b2)

Store path was **only** the repo file:

```powershell
function Get-KeyVaultStorePath {
  $root = Get-KeyVaultRepoRoot
  return (Join-Path $root 'vault\secrets\env-store.json')
}
```

So sync and set-secret always used **`vault\secrets\env-store.json`** in the repo.

## After (Feb 6, 2026 – 52f6aa4)

The commit added:

1. `KEYVAULT_STORE_PATH` env override
2. A **candidate list** checked **before** the repo path:
   - `C:\Cevict_Vault\env-store.json` (and several variants)

So the resolution order became:

1. `KEYVAULT_STORE_PATH` if set  
2. **Any** of the `C:\Cevict_Vault\...` paths **if the file exists**  
3. Repo `vault\secrets\env-store.json`

## Why keys "disappeared"

- If your real keys were (and had been for months) in **repo `vault\secrets\env-store.json`**, then after Feb 6 the script started using **`C:\Cevict_Vault\env-store.json`** first **when that file exists**.
- If `C:\Cevict_Vault\env-store.json` existed but was **empty or an old copy** without the Supabase (and other) keys, sync would read from it and overwrite apps' `.env.local` with missing vars → keys "disappear" in the generated files.
- So the **break** is: a file at a **preferred** path (Cevict_Vault) was used instead of the repo store that actually had your keys.

## Fix (current behavior)

**Your keys are in `C:\Cevict_Vault\env-store.json`** — that file has almost all keys (only 2 optional monitor keys missing). The repo `vault\secrets\env-store.json` is mostly empty.

KeyVault is set to **prefer Cevict_Vault when that file exists**, so sync and set-secret use your real store. Run:

```powershell
.\scripts\keyvault\sync-env.ps1 -AppPath .\apps\monitor
```

to repopulate monitor's `.env.local` from the Cevict_Vault store. To pin the store explicitly: `$env:KEYVAULT_STORE_PATH = "C:\Cevict_Vault\env-store.json"`.
