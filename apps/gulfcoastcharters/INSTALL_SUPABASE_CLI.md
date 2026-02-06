# Install Supabase CLI

## Option 1: Install via npm (Recommended)

```powershell
npm install -g supabase
```

## Option 2: Install via Scoop (Windows)

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

## Option 3: Download Binary

Download from: https://github.com/supabase/cli/releases

## After Installation

1. **Login to Supabase:**
   ```powershell
   supabase login
   ```

2. **Link to your project:**
   ```powershell
   cd apps/gulfcoastcharters
   supabase link --project-ref rdbuwyefbgnbuhmjrizo
   ```

3. **Deploy the function:**
   ```powershell
   supabase functions deploy stripe-checkout
   ```

4. **Set the Stripe secret:**
   ```powershell
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   ```

## Verify Installation

```powershell
supabase --version
```
