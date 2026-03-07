# Deep Audit: Bugs (Introduced or Exposed) — Accu Solar

**Scope:** Changes from recent cleanup, auth, usage cap, and component extraction.  
**Date:** 2025-03-06

---

## Fixed in This Audit

### 1. **Duplicate `const supabase` in ai-chat route (live)**

- **Where:** `app/api/ai-chat/route.ts`
- **Issue:** `const supabase = getSupabaseServerClient()` was declared twice in the same handler (subscription check and usage cap). Second declaration would throw "Identifier 'supabase' has already been declared" at runtime.
- **Fix:** Removed the second declaration; reuse the same `supabase` for the usage query.

### 2. **Dashboard AI chat body shape mismatch (live, then archive)**

- **Where:** `AIChatPanelCommand.tsx` sends `{ message, telemetry, weather, location, history }`; API expected `{ messages[], context?, mode? }`.
- **Issue:** Dashboard always got **400 "Missing messages[] in body"** when sending a message.
- **Fix:** API now accepts **dashboard shape**: if `messages` is missing but `message` is a string, it builds `messages` from `history` + new `message` and builds `context` from `telemetry` / `weather` / `location`. Same logic added in archive for consistency.

---

## Testing Checklist

Use this while you test:

- [ ] **AI chat (dashboard)**  
  Open the in-dashboard AI panel, send a message. Expect 200 and a reply (or 401 if not logged in, 403 if Basic tier). No 400 for "Missing messages[]".

- [ ] **AI chat (monthly cap)**  
  Professional user over 500 requests in the current month should get 429 "Monthly AI request limit reached" with `current`, `limit`, `reset_month`.

- [ ] **Telemetry ingest**  
  POST `/api/telemetry/ingest` with `Authorization: Bearer <token>` and body `{ "siteId": "<uuid>" }`. Expect 200 and `stored: true` for Pro tier; 401 without token; 404 if site not found or not owned.

- [ ] **Weather**  
  GET `/api/weather?lat=&lon=` with valid coords. Expect 200 and `temperatureC`, `cloudCover`, `windSpeed`, `ghi` (or fallback). Uses `WEATHERAPI_KEY ?? NEXT_PUBLIC_WEATHERAPI_KEY`.

- [ ] **Supabase (solar-core)**  
  Any flow that uses `supabaseService` (e.g. scenarios, telemetry history) should use `NEXT_PUBLIC_SUPABASE_URL` with fallback; anon key required.

- [ ] **Exports count**  
  After using AI chat, check `accu_solar_usage` for that user/month: `exports_count` should be unchanged (only `ai_requests` incremented).

---

## Notes (Not Bugs, For Your Awareness)

- **Auth for AI chat / ingest**  
  Both require `Authorization: Bearer <token>`. The dashboard does not add this header itself. If the app uses Supabase auth, ensure the client (e.g. via a provider or layout) attaches the session token to requests to `/api/ai-chat` and `/api/telemetry/ingest` when the user is logged in; otherwise you’ll see 401.

- **Telemetry ingest from SolarContext**  
  `SolarContext.tsx` currently calls `fetch('/api/telemetry/ingest')` with no method (GET) and no body. The ingest route is POST and expects JSON with `siteId`. So that poll path will not successfully ingest; consider changing to POST with body and auth when you want that flow.

- **Rate limiting**  
  AI chat uses an in-memory per-user hourly limit. In serverless/edge, this resets on cold starts and is not shared across instances.

---

## Summary

- **2 bugs fixed:** duplicate `supabase` in live ai-chat; dashboard AI chat body shape in both live and archive.
- **No other regressions found** in the modified areas (weather key, Supabase URL, tsconfig paths, Web Bluetooth types, extracted components, ingest auth, usage upsert with `exports_count`).
- Run the testing checklist above to validate behavior end-to-end.
