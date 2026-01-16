# 🐾 PetReunion DNS Error Fix

## Issue
```
TypeError [ERR_INVALID_ARG_VALUE]: The argument '--dns-result-order' must be one of: 'verbatim', 'ipv4first', 'ipv6first'. Received 'ipv4first\r\n'
```

## Root Cause
The `NODE_OPTIONS` environment variable in `.env.local` had a Windows line ending (`\r\n`) appended to the value, causing Node.js to reject it.

## Solution
Updated `package.json` to use `cross-env` to set `NODE_OPTIONS` cleanly in the dev script:

```json
"dev": "cross-env NODE_OPTIONS=\"--dns-result-order=ipv4first\" next dev -p 3007"
```

This ensures the value is set correctly without any line ending issues.

## Changes Made
1. ✅ Added `cross-env` as a dev dependency
2. ✅ Updated `dev` script to use `cross-env` to set `NODE_OPTIONS`
3. ✅ Fixed `.env.local` file to remove line endings from `NODE_OPTIONS`

## Testing
Run `npm run dev` - the DNS error should be resolved. The server should start on port 3007.

## Note
If you still see a `fetch failed` error during startup, it's just Next.js trying to check for updates. The server should still start successfully.

