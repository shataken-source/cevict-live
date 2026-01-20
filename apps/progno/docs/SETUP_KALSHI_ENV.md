# Setup Kalshi Environment Variables

## ✅ Quick Setup

The `.env.local` file has been created in `apps/progno/` with your Kalshi API credentials.

## 📝 File Location

```
apps/progno/.env.local
```

## 🔐 Credentials Included

- **KALSHI_API_KEY_ID**: `8ccdb333-2be7-4fb0-a051-d86e415bfca4`
- **KALSHI_PRIVATE_KEY**: Your RSA private key (full key included)

## ⚠️ Important Notes

1. **File is in `.gitignore`**: The `.env.local` file is automatically ignored by Git (see `.gitignore` line 70: `.env.*`)

2. **Restart Dev Server**: After creating/updating `.env.local`, restart your dev server:
   ```powershell
   # Stop current server (Ctrl+C)
   cd apps/progno
   pnpm dev
   ```

3. **Private Key Format**: The private key is stored as a single line with `\n` for newlines. Next.js will automatically parse this.

4. **Alternative Storage**: If you prefer, you can also:
   - Store keys in Progno's API Keys page (localStorage)
   - Store in `.progno/keys.json` (keys-store)
   - Use Vercel environment variables for production

## 🧪 Test It

Once the dev server restarts, try asking a question in "Predict Anything":
- "Will the US enter a recession in 2024?"
- "Who will win the 2024 election?"
- "Will there be an AI breakthrough in 2024?"

The system will try to use the real Kalshi API if credentials are found, otherwise it falls back to mock data.

## 🔍 Verify It's Working

Check the browser console or server logs. You should see:
- ✅ "Kalshi API call successful" (if API works)
- ⚠️ "Kalshi API call failed, falling back to mock data" (if API needs RSA signature implementation)

## 📚 Next Steps

The Kalshi API requires RSA signature authentication. The current implementation has a placeholder. You may need to:

1. Install crypto library: `npm install node-forge` or use Node's built-in `crypto`
2. Implement RSA signature generation per Kalshi's API docs
3. Sign each API request with the private key

See `KALSHI_INTEGRATION.md` for more details.

