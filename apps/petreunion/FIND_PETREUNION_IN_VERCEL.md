# 🔍 How to Find PetReunion in Vercel Root Directory

## Problem: PetReunion Not Showing in Directory List

The directory exists, but Vercel's modal might not show all directories. Here's how to fix it:

---

## ✅ Solution 1: Scroll Down in the List

1. In the "Root Directory" modal, click on `apps` to expand it
2. **Scroll down** in the list - there might be more directories below
3. Look for `petreunion` - it should be there
4. Click the radio button next to `petreunion`
5. Click "Continue"

---

## ✅ Solution 2: Type the Path Manually

If there's a text input field in the modal:

1. Look for a text input or "Custom" option
2. Type: `apps/petreunion`
3. Click "Continue"

---

## ✅ Solution 3: Select `apps` and Set Path Later

1. **Select `apps`** (the parent directory) in the modal
2. Click "Continue"
3. On the next screen, look for "Root Directory" setting
4. **Manually type:** `apps/petreunion`
5. Continue with deployment

---

## ✅ Solution 4: Set Root Directory After Project Creation

If you've already created the project:

1. Go to your project in Vercel Dashboard
2. Click **"Settings"** (top navigation)
3. Click **"General"** (left sidebar)
4. Scroll to **"Root Directory"** section
5. Click **"Edit"**
6. Type: `apps/petreunion`
7. Click **"Save"**
8. Go to **"Deployments"** tab
9. Click **"Redeploy"** or trigger a new deployment

---

## ✅ Solution 5: Use Vercel CLI (Bypass UI)

If the UI is giving you trouble, use CLI:

```powershell
cd c:\cevict-live\apps\petreunion
vercel --prod
```

The CLI will ask for root directory - type: `apps/petreunion`

---

## 🎯 Quick Fix Right Now

**Easiest approach:**

1. In the modal, **select `apps`** (the parent)
2. Click **"Continue"**
3. On the configuration page, find **"Root Directory"**
4. Change it from `apps` to `apps/petreunion`
5. Continue with deployment

---

## 📝 Verify Directory Exists

The directory definitely exists at: `c:\cevict-live\apps\petreunion`

If Vercel still doesn't show it:
- Try refreshing the page
- Try logging out and back into Vercel
- Check if you're connected to the right Git repository
- Make sure your latest code is pushed to Git
