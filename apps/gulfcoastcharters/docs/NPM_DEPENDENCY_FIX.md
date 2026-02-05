# NPM Dependency Conflict Fix

## Problem
The `npm ci` command is failing due to an ESLint version conflict in the package-lock.json file.

## Root Cause
The package-lock.json contains old @typescript-eslint packages (v6.x) that are incompatible with ESLint 9.x. The package.json has been updated to use the modern `typescript-eslint` package (v8.x) which supports ESLint 9, but the lock file hasn't been regenerated.

## Solution

Run these commands in order:

```bash
# 1. Remove the old lock file
rm package-lock.json

# 2. Clear npm cache (optional but recommended)
npm cache clean --force

# 3. Generate a fresh package-lock.json with compatible versions
npm install

# 4. Now npm ci will work
npm ci
```

## Alternative Quick Fix

If you just want to install dependencies without regenerating the lock file:

```bash
npm install --legacy-peer-deps
```

Or simply:

```bash
npm install
```

(The .npmrc already has legacy-peer-deps=true)

## What Changed
- ESLint upgraded from v8 to v9
- Old @typescript-eslint/* packages replaced with modern typescript-eslint package
- Lock file needs regeneration to reflect these changes

## Verification
After running the fix, verify with:
```bash
npm list eslint
npm list typescript-eslint
```

You should see:
- eslint@9.39.1
- typescript-eslint@8.0.1
