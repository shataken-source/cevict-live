# AdSense Site Verification Fix

Your AdSense dashboard shows **"Unable to verify site ownership"** or **"Not found"** when Google’s crawler doesn’t see a valid **site verification** code on the domain. The code is different from your AdSense publisher ID (`ca-pub-...`).

## What was changed in this repo

Each app now supports **Google site verification** via a meta tag in the HTML `<head>`:

- **gulfcoastcharters** – `_document.js` + `SEOHead.jsx` (env-driven)
- **petreunion** – `app/layout.tsx`
- **popthepopcorn** – `app/layout.tsx`
- **prognostication** – `app/layout.tsx`
- **smokersrights** – `app/layout.tsx`

The meta tag is only rendered when the env var is set (no placeholder code), so Google only sees a real verification code.

## What you need to do per site

### 1. Get the verification code from AdSense

1. In [AdSense](https://www.google.com/adsense/) go to **Sites** (or **Account** → **Sites**).
2. Open the site that shows "Unable to verify" or "Not found".
3. Click **Verify** (or **Get code**).
4. Choose **HTML tag**.
5. Copy the **content** value from the tag, e.g.  
   `<meta name="google-site-verification" content="AbCdEfGhIjKlMnOpQrStUvWxYz1234567890" />`  
   → you need only: `AbCdEfGhIjKlMnOpQrStUvWxYz1234567890`

### 2. Set the env var for that domain

For each domain (Vercel project or env file), add:

```bash
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

- **Vercel:** Project → Settings → Environment Variables. Add for Production (and Preview if you want). Redeploy.
- **Local:** `.env.local` (and ensure it’s not committed).

Use the **exact** code AdSense shows for that domain; each site can have a different code.

### 3. Redeploy and verify

1. Deploy the app so the new env is in effect.
2. In AdSense, click **Verify** again.
3. Wait for Google to re-crawl (can take a few hours). Status should move from "Unable to verify" / "Not found" to verified.

### Optional: HTML file method

If AdSense gives you an **HTML file** (e.g. `google123abc.html`):

1. Download the file (it usually contains one line like `google-site-verification: google123abc.html`).
2. Put it in the app’s **public** folder (e.g. `apps/gulfcoastcharters/public/google123abc.html`).
3. Redeploy so the file is served at `https://yourdomain.com/google123abc.html`.
4. In AdSense, choose the file method and verify.

## Sites in this repo

| Domain                   | App                | Env location |
|--------------------------|--------------------|--------------|
| gulfcoastcharters.com    | apps/gulfcoastcharters | Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel / .env |
| petreunion.org           | apps/petreunion    | Same         |
| popthepopcorn.com        | apps/popthepopcorn | Same         |
| prognostication.com      | apps/prognostication | Same       |
| smokersrights.com        | apps/smokersrights | Same         |

## trailervegas.com

**trailervegas.com** is not in this repository. To fix AdSense for that domain:

1. Add the same `<meta name="google-site-verification" content="YOUR_CODE" />` in the `<head>` of that project’s main layout or document.
2. Or add the verification HTML file to that project’s public/static root and redeploy.
3. Set the env var (or equivalent) in that project’s hosting (e.g. Vercel) and redeploy.

## "Requires review" / "Getting ready"

After verification, status may stay **"Requires review"** or **"Getting ready"** while AdSense checks policy and content. That’s normal; no code change is required. Ensure the site has enough original content and complies with [AdSense program policies](https://support.google.com/adsense/answer/48182).
