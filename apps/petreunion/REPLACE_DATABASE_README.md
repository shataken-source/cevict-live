# Replace FREE Database with PRO Database

This script replaces all occurrences of the FREE database URL with the PRO database URL across all files.

## Usage

### Dry Run (Preview Changes)
```powershell
cd apps/petreunion
.\replace-free-with-pro-database.ps1 -DryRun
```

This will show you:
- Which files contain the FREE database URL
- How many replacements will be made in each file
- **No files will be modified**

### Apply Changes
```powershell
cd apps/petreunion
.\replace-free-with-pro-database.ps1
```

This will:
1. Scan all files
2. Show you what will be changed
3. Ask for confirmation
4. Apply all replacements

## What Gets Replaced

**FREE Database:**
- `https://rdbuwyefbgnbuhmjrizo.supabase.co`
- `https://rdbuwyefbgnbuhmjrizo.supabase.co`
- `rdbuwyefbgnbuhmjrizo.supabase.co`
- `rdbuwyefbgnbuhmjrizo`

**PRO Database (replacement):**
- `https://rdbuwyefbgnbuhmjrizo.supabase.co`
- `https://rdbuwyefbgnbuhmjrizo.supabase.co`
- `rdbuwyefbgnbuhmjrizo.supabase.co`
- `rdbuwyefbgnbuhmjrizo`

## Excluded Directories

The script automatically excludes:
- `node_modules/`
- `.git/`
- `.next/`
- `dist/`
- `build/`
- `.vscode/`
- `.idea/`
- `*.log` files
- The script itself (`*.ps1`)

## Safety

- Always run with `-DryRun` first to preview changes
- The script will ask for confirmation before making changes
- Each file is processed individually with error handling

## Example Output

```
=== Database URL Replacement Script ===

FREE Database: https://rdbuwyefbgnbuhmjrizo.supabase.co
PRO Database:  https://rdbuwyefbgnbuhmjrizo.supabase.co

Scanning 1234 files...

Found 5 file(s) containing FREE database URL:
Total replacements needed: 8

  - recover-all-pets.ts (2 replacement(s))
  - verify-before-copy.ts (1 replacement(s))
  - check-schemas.ts (1 replacement(s))
  - RUN_RECOVERY.ps1 (2 replacement(s))
  - README.md (2 replacement(s))

Do you want to proceed with replacements? (yes/no): yes

Applying replacements...
  ✅ recover-all-pets.ts
  ✅ verify-before-copy.ts
  ✅ check-schemas.ts
  ✅ RUN_RECOVERY.ps1
  ✅ README.md

=== Summary ===
Files processed: 5
Total replacements: 8

✅ Replacement complete!
```
