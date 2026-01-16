# ✅ CORRECT FORGE SETUP

## 🎯 The Real Forge API Location

**The Forge API is in `apps/cevict`, NOT in `apps/wheretovacation`!**

- ✅ **Real Forge API:** `apps/cevict/app/api/bubble/*`
- ❌ **Fake Routes (DELETED):** `apps/wheretovacation/app/api/bubble/*` (Windsurf created these incorrectly)

## 🔌 Port Assignments

| Port | App | Purpose |
|------|-----|---------|
| **3000** | Gateway | Landing page / admin dashboard |
| **3001** | **CEVICT / Forge** | **AI collaboration platform + Forge API** |
| **3002** | WhereToVacation | PetReunion + vacation booking |
| 3003+ | Available | For other apps |

## ✅ Your Scripts Are CORRECT

The scripts I wrote (`create-forge-bubble.ps1` and `trigger-bubble-agents.ps1`) are **100% correct**:

- They point to `http://localhost:3001/api/bubble/*` ✅
- Port 3001 is where CEVICT (the real Forge) runs ✅
- The real API routes exist in `apps/cevict/app/api/bubble/` ✅

## 🚀 How to Start Everything

### Option 1: Use the Batch Script
```batch
cd C:\gcc\cevict-app\cevict-monorepo\apps\wheretovacation\app\petreunion
START_FORGE_CORRECTLY.bat
```

### Option 2: Manual Start
```powershell
# Terminal 1: Start CEVICT/Forge (REQUIRED FIRST!)
cd C:\gcc\cevict-app\cevict-monorepo\apps\cevict
pnpm dev

# Terminal 2: Start PetReunion (optional, for the website)
cd C:\gcc\cevict-app\cevict-monorepo\apps\wheretovacation
pnpm dev
```

## 📍 Access Points

- **Forge UI:** http://localhost:3001/auspicio/forge
- **PetReunion Website:** http://localhost:3002/petreunion
- **Gateway:** http://localhost:3000

## ✅ Verify Forge is Running

Run this to check:
```powershell
cd C:\gcc\cevict-app\cevict-monorepo\apps\wheretovacation\app\petreunion
.\check-bubble-status.ps1
```

## 🎯 Create and Trigger Bubble

```powershell
# Step 1: Create the bubble (if it doesn't exist)
.\create-forge-bubble.ps1

# Step 2: Trigger agents to start working
.\trigger-bubble-agents.ps1
```

## ❌ What Was Wrong

1. **Windsurf created fake routes** in `apps/wheretovacation/app/api/bubble/` - **DELETED** ✅
2. **Your batch script tried to use port 3001** for PetReunion - **WRONG** (3001 is for Forge!)
3. **The real Forge API** is in `apps/cevict` - **CORRECT** ✅

## ✅ What's Fixed

- ✅ Deleted fake bubble routes Windsurf created
- ✅ Scripts point to correct Forge API (port 3001)
- ✅ Created correct startup batch script
- ✅ Port assignments clarified

**Everything should work now!** 🎉

