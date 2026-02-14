# Clerk security checklist

Use this to confirm your Clerk Dashboard settings are in good shape. Based on your current screenshots.

---

## ✅ Already in good shape

| Area | What you have |
|------|----------------|
| **Email** | Sign-up with email ON, Require email ON, **Verify at sign-up ON** (recommended), Email verification code, Sign-in with email ON. |
| **Phone** | Sign-up/sign-in with phone ON, Require phone ON, Verify at sign-up ON, SMS verification code ON. |
| **Password** | Sign-up with password ON, Add password ON, **Client Trust ON** (helps prevent credential stuffing; second factor on new devices). Min length 8, **Reject compromised passwords ON**. |
| **User model** | First/last name ON, Allow users to delete their accounts ON. |
| **MCP** | Clerk MCP “Add to Cursor” is done if you use it. |
| **Attack protection** | Lockout (e.g. 5 attempts), bot sign-up (Turnstile), user-enumeration (Bulk or Strict). |

---

## ⚠️ Optional / planned

1. **Password rules (Pro)**  
   - The granular character rules (lowercase, uppercase, number, special) are Pro; plan to enable when you go live with Clerk Pro.  
   - Clerk's UI warns these rules may reduce real security (NIST doesn't recommend them). Use if compliance requires; otherwise reject compromised + min length + strength is often enough.

2. **SMS allowlist**  
   - Blue banner: “SMS functionality is restricted to countries on your SMS allowlist.”  
   - If you need SMS in more countries, go to **Manage allowlist settings** and add them. If you’re fine with the current list, no change needed.

3. **Require first and last name**  
   - “Require first and last name” is OFF (optional at sign-up).  
   - Turn ON only if you want to force full names for every user.

---

## 🔴 Do this in your app (not just Dashboard)

- **Secure your app’s backend**  
  The Dashboard card “Secure your app’s backend” is a reminder: any API routes or server logic that depend on “who is logged in” must **verify the Clerk session/token** (e.g. `auth()` or `getToken()` in your backend). If you haven’t done that yet, add auth checks to protected routes and APIs.

- **Redirect URLs**  
  You already use `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` in code. Prefer that over deprecated env vars (`NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` etc.) and remove those from `.env` if still present.

---

## Attack protection (User & authentication → Attack protection)

- **Lockout policy:** 5 failed attempts then lockout is sensible. Prefer **time limit** (e.g. 15 min) unless you want manual unlock only (indefinite).
- **Bot sign-up protection:** Turn ON so new sign-ups get Cloudflare Turnstile (“confirm you’re human”). Reduces fake sign-ups.
- **User enumeration:** **Bulk** = rate limits bulk checks; **Strict** = stronger privacy (generic sign-in messages). Use Strict if you don’t want to leak “this email is registered.”

---

## Quick recap

- **Dashboard:** Email, phone, password, user-model, and attack-protection settings look solid; optional tweaks are password strength, SMS allowlist, and requiring first/last name.  
- **App:** Ensure every protected route and API uses Clerk auth (backend verification). That’s the main thing to “check” beyond the Dashboard.

---

## When you go Pro

- **Remove "Secured by Clerk" badge:** Dashboard → **Settings** → **Branding** → turn on **Remove "Secured by Clerk" branding** (production use requires a paid plan).
- **Password rules:** Enable the Pro character rules (lowercase, uppercase, number, special) in **User & authentication** → **Password** → Password requirements if your policy requires them; keep the NIST warning in mind.

---

## Webhooks

**Not required** for apps that only use Clerk for sign-in and “who is logged in.”  
**Add an endpoint** (Developers → Webhooks → Add Endpoint) if you need to: sync users to your own DB (`user.created` / `user.updated` / `user.deleted`), run server logic on sign-up (e.g. welcome email, Stripe customer), or react to organization events. Use the **Event Catalog** tab to choose events; verify the request signature in your endpoint.
