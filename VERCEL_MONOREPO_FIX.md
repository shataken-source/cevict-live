# Vercel Monorepo - Stop Deployment Spam

## Problem
Every project deploys on every commit, wasting build minutes and costing money.

## Solution
Set **Ignored Build Step** in Vercel Dashboard for each project.

---

## Instructions

For **each project** below, go to its Vercel dashboard:

**Settings → General → Ignored Build Step**

(Scroll down to the "Build & Development Settings" section)

Paste the command shown below and click **Save**.

---

## Project Settings

### 1. progno
**Dashboard**: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/progno/settings

**Ignored Build Step**:
```bash
git diff --quiet HEAD^ HEAD -- apps/progno/
```

---

### 2. accu-solar
**Dashboard**: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/accu-solar/settings

**Ignored Build Step**:
```bash
git diff --quiet HEAD^ HEAD -- apps/accu-solar/
```

---

### 3. kalshi-dash
**Dashboard**: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/kalshi-dash/settings

**Ignored Build Step**:
```bash
git diff --quiet HEAD^ HEAD -- apps/kalshi-dash/
```

---

### 4. praxis
**Dashboard**: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/praxis/settings

**Ignored Build Step**:
```bash
git diff --quiet HEAD^ HEAD -- apps/praxis/
```

---

### 5. popthepopcorn
**Dashboard**: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/popthepopcorn/settings

**Ignored Build Step**:
```bash
git diff --quiet HEAD^ HEAD -- apps/popthepopcorn/
```

---

### 6. gulfcoastcharters
**Dashboard**: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/gulfcoastcharters/settings

**Ignored Build Step**:
```bash
git diff --quiet HEAD^ HEAD -- apps/gulfcoastcharters/
```

---

### 7. petreunion
**Dashboard**: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/petreunion/settings

**Ignored Build Step**:
```bash
git diff --quiet HEAD^ HEAD -- apps/petreunion/
```

---

### 8. ai-generated-rv-monitor
**Dashboard**: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/ai-generated-rv-monitor/settings

**Ignored Build Step**:
```bash
git diff --quiet HEAD^ HEAD -- apps/monitor/
```

---

### 9. switchback-tv-apk
**Dashboard**: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/switchback-tv-apk/settings

**Ignored Build Step**:
```bash
git diff --quiet HEAD^ HEAD -- apps/SwitchbackTV/
```

---

### 10. smokersrights
**Dashboard**: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/smokersrights/settings

**Ignored Build Step**:
```bash
git diff --quiet HEAD^ HEAD -- apps/smokersrights/
```

---

### 11. cevict-live (if it's an app)
**Dashboard**: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/cevict-live/settings

**Ignored Build Step**:
```bash
git diff --quiet HEAD^ HEAD -- apps/cevict-ai/
```
*(Adjust path based on which app this project represents)*

---

## How It Works

The command `git diff --quiet HEAD^ HEAD -- apps/PROJECT_NAME/` checks if files in that specific app folder changed.

- **Exit 0** (no changes) → Skip build ✅
- **Exit 1** (changes detected) → Run build ✅

This ensures each project only builds when its own files change.

---

## After Configuration

Once all projects have their Ignored Build Step set:

1. Only commits that modify a specific app will trigger that app's deployment
2. Other apps will be skipped automatically
3. Build minutes saved = money saved 💰

---

## Test

After setting all Ignored Build Steps, make a change to **only** Progno:

```powershell
cd C:\cevict-live\apps\progno
echo "test" >> README.txt
git add .
git commit -m "test: verify only progno deploys"
git push
```

**Expected**: Only Progno deploys, all other projects skipped.

---

## Priority Order

Configure in this order to save the most money:

1. **accu-solar** (frequently errors)
2. **kalshi-dash** (frequently errors)
3. **praxis** (frequently errors)
4. **gulfcoastcharters** (frequently errors)
5. **petreunion** (frequently errors)
6. **switchback-tv-apk** (frequently errors)
7. **ai-generated-rv-monitor** (queued often)
8. **popthepopcorn** (production builds)
9. **cevict-live** (production builds)
10. **progno** (already configured)
