# PetReunion Vercel env reference (no secrets)

Set these in the `petreunion-app` Vercel project (Production):

```
NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
NEXT_PUBLIC_ODDS_API_KEY=<your_the_odds_api_key_if_needed>
```

Build settings:
- Root Directory: `apps/wheretovacation`
- Install: `pnpm install --no-frozen-lockfile`
- Build: `pnpm build`
- Output: `.next`

Domains to attach after a successful deploy:
- petreunion.org
- www.petreunion.org

