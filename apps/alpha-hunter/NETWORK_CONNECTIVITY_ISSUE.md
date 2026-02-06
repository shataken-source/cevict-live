# Network Connectivity Issue - DNS Resolution Failures

## 🚨 Current Problem

The bot cannot connect to:
- **Supabase**: `nqkbqtiramecvmmpaxzk.supabase.co` (DNS: `ENOTFOUND`)
- **Kalshi API**: `demo-api.kalshi.co` (DNS: `ENOTFOUND`)

**Error:**
```
Error: getaddrinfo ENOTFOUND nqkbqtiramecvmmpaxzk.supabase.co
Error: getaddrinfo ENOTFOUND demo-api.kalshi.co
```

This is a **network/infrastructure issue**, not a code problem.

---

## ✅ Immediate Troubleshooting Steps

### 1. Check Internet Connection
```powershell
# Test basic connectivity
ping google.com
ping 8.8.8.8
```

### 2. Test DNS Resolution
```powershell
# Test if DNS can resolve the hostnames
nslookup nqkbqtiramecvmmpaxzk.supabase.co
nslookup demo-api.kalshi.co
```

### 3. Check Firewall/VPN
- **Firewall**: Windows Firewall may be blocking Node.js
- **VPN**: If using VPN, try disconnecting/reconnecting
- **Corporate Network**: May have DNS restrictions

### 4. Try Different DNS Server
```powershell
# Flush DNS cache
ipconfig /flushdns

# Try using Google DNS (8.8.8.8) or Cloudflare (1.1.1.1)
# Windows: Network Settings > Change adapter options > Properties > IPv4 > Use custom DNS
```

### 5. Check Proxy Settings
```powershell
# Check if proxy is interfering
echo $env:HTTP_PROXY
echo $env:HTTPS_PROXY
```

### 6. Restart Network Adapter
```powershell
# Run as Administrator
ipconfig /release
ipconfig /renew
```

---

## 🔧 Code Improvements Made

I've improved error handling to:
- ✅ Detect network/DNS failures specifically
- ✅ Throttle error logging (only log every 30 seconds instead of spamming)
- ✅ Provide clearer error messages

**Files updated:**
- `apps/alpha-hunter/src/lib/supabase-memory.ts` - Network error detection
- `apps/alpha-hunter/src/intelligence/kalshi-trader.ts` - Network error throttling

---

## 📋 After Network is Fixed

Once connectivity is restored:

1. **Restart the bot** to pick up the $1000 spending limit:
   ```bash
   npm run kalshi:sandbox
   ```

2. **Verify** you see:
   ```
   💰 Daily limit for world: $1000 (params: 1000, config: 1000, using: strategy_params)
   💰 Daily limit for derivatives: $1000 (params: 1000, config: 1000, using: strategy_params)
   ```

3. **Check** that network errors stop appearing

---

## 🎯 Expected Behavior After Fix

**Before (Network Down):**
- ❌ DNS resolution failures
- ❌ Cannot reach Supabase or Kalshi
- ❌ Bot stuck in error loop

**After (Network Fixed):**
- ✅ Can connect to Supabase
- ✅ Can connect to Kalshi API
- ✅ Bot can fetch predictions and place trades
- ✅ Daily limit: $1000 (after restart)

---

## 💡 Common Causes

1. **Internet connection down** - Check router/modem
2. **DNS server issues** - ISP DNS may be down
3. **Firewall blocking** - Windows Firewall or antivirus
4. **VPN interference** - VPN may be blocking DNS
5. **Corporate network** - May have DNS restrictions
6. **ISP DNS problems** - Try switching to Google DNS (8.8.8.8)

---

**Status:** Network connectivity issue - needs infrastructure fix 🔧
