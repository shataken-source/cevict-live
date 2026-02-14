# Catch Logging & Social Sharing (No-BS)

Catch logging with leaderboard and social sharing. This doc reflects what’s in the repo and what you need to run it.

---

## What’s in the repo

| Piece | Location | Notes |
|-------|----------|--------|
| **CatchLogger** | `src/components/CatchLogger.tsx` | Form: species, weight, length, location, date, photo, notes. Uses AI species recognition (optional). Uploads photo to `catch-photos` bucket, submits via `catch-logger` edge function. |
| **CatchLeaderboard** | `src/components/CatchLeaderboard.tsx` | Lists top catches by weight; filter by species. Uses `catch-logger` for species list and leaderboard. Share button per catch. |
| **SocialShareButton** | `src/components/SocialShareButton.tsx` | Supports type `catch`; calls `share-image-generator` for branded image, tracks in `social_shares`. |
| **catch-logger** | `supabase/functions/catch-logger/index.ts` | Actions: `get_species`, `get_leaderboard`, `log_catch`. |
| **share-image-generator** | `supabase/functions/share-image-generator/index.ts` | Supports `type: 'catch'` with weight, species, location. Needs `GATEWAY_API_KEY` for image gen. |
| **DB migration** | `supabase/migrations/20260210_catch_logging_tables.sql` | Creates `fish_species`, `user_catches`, `catch_likes` and seeds species. |

---

## Database

Run the migration so the tables and RLS exist:

- Apply `supabase/migrations/20260210_catch_logging_tables.sql` (via Supabase CLI or SQL Editor).

That file creates:

- **fish_species** – id, name, scientific_name, category; seed data for 8 species.
- **user_catches** – user_id, species_id, weight, length, location, catch_date, photo_url, notes, is_verified, shares_count, likes_count.
- **catch_likes** – catch_id, user_id (unique per catch/user).

RLS: public read on species and catches; users can insert/update only their own catches; likes readable by all, writable by own user.

---

## Storage

- **Bucket:** `catch-photos` (public for read).
- Create it in Supabase Dashboard → Storage if it doesn’t exist. CatchLogger uploads directly from the client to this bucket.

---

## Edge functions

1. **catch-logger**  
   - Deploy: `supabase functions deploy catch-logger`  
   - No extra env vars. Uses `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.

2. **share-image-generator**  
   - Used for social share images (including catch).  
   - Requires `GATEWAY_API_KEY` for image generation; see function code. Optional: `SITE_URL` for fallback image.

---

## Usage (in app)

- **Log a catch:** Wherever CatchLogger is mounted (e.g. Community → Log Catch): fill form, optional photo, optional “Identify Fish Species” (AI). Submit calls `catch-logger` with `action: 'log_catch'`.
- **Leaderboard:** CatchLeaderboard loads species and leaderboard via `catch-logger` (`get_species`, `get_leaderboard`). Filter by species in the dropdown.
- **Share:** Share button on a catch uses SocialShareButton with `type="catch"` and passes species, weight, location, etc.; share-image-generator builds the image; share is recorded in `social_shares`.

---

## Verification and likes

- **is_verified:** Column exists on `user_catches`; no automatic verification flow in this codebase. You can set it via admin or a separate process.
- **catch_likes:** Table and RLS exist; no like button wired in CatchLeaderboard in the current snippet. Add UI that inserts/ deletes from `catch_likes` if you want likes.

---

## Social sharing

- Share tracking: `social_shares` table (see `20260119_social_shares_system.sql` or equivalent).
- Catch share image: Gulf Coast Charters branding, species, weight, location; angler name from `profiles.full_name`. Requires share-image-generator and gateway API for generated image.

---

**Last updated:** February 2026 (no-BS pass).  
**Cross-check:** `FEATURE_IMPLEMENTATION_STATUS.md`, `COMPREHENSIVE_PLATFORM_GUIDE.md` (no-BS).
