# CRITICAL SETUP INSTRUCTIONS

## ⚠️ SECURITY - DO THIS FIRST

### 1. Environment Variables (REQUIRED)
Create `.env` file in root directory:

```env
VITE_SUPABASE_URL=https://xzdzmeaxbjvntuqeommq.databasepad.com
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**CRITICAL**: Never commit `.env` to GitHub. It's in `.gitignore`.

### 2. Supabase Row Level Security (RLS)
Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE charters ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see/edit their own
CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Bookings: Users see their own, captains see their charters
CREATE POLICY "Users view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Captains view charter bookings" ON bookings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT captain_id FROM charters WHERE id = charter_id
    )
  );

-- Admin access to everything
CREATE POLICY "Admins full access" ON profiles
  FOR ALL USING (
    (SELECT user_metadata->>'role' FROM auth.users 
     WHERE id = auth.uid()) = 'admin'
  );
```

### 3. GitHub Secrets (For Deployment)
Add these in: Settings → Secrets and variables → Actions

Required secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VERCEL_TOKEN` (from vercel.com/account/tokens)
- `VERCEL_ORG_ID` (from .vercel/project.json)
- `VERCEL_PROJECT_ID` (from .vercel/project.json)

### 4. Rate Limiting (Supabase Dashboard)
1. Go to Authentication → Rate Limits
2. Set: 10 requests per 10 seconds per IP
3. Enable CAPTCHA for signup after 3 failed attempts

## 🧪 TESTING

### Run Test Scripts
```bash
# Install dependencies
npm install

# Run Admin tests
npm run test:admin

# Run Captain tests
npm run test:captain

# Run all tests
npm test
```

### Manual Testing Checklist
- [ ] Admin can view all users
- [ ] Admin can reset passwords
- [ ] Captain can view their bookings
- [ ] Captain cannot see other captains' data
- [ ] Regular user cannot access admin panel
- [ ] Session timeout works (30 min)
- [ ] 2FA setup and verification works

## 🚀 DEPLOYMENT

### GitHub Setup
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### Vercel Deployment
```bash
npm install -g vercel
vercel login
vercel --prod
```

Add environment variables in Vercel Dashboard.

### Netlify Deployment
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

## 📋 POST-DEPLOYMENT CHECKLIST
- [ ] All environment variables set
- [ ] RLS policies enabled
- [ ] OAuth providers configured
- [ ] Email templates tested
- [ ] Analytics tracking working
- [ ] Error logging configured
- [ ] Backup strategy in place

## 🔒 SECURITY BEST PRACTICES
1. Never expose service role key in client code
2. Always use RLS policies
3. Validate all user inputs
4. Use prepared statements for queries
5. Enable 2FA for admin accounts
6. Regular security audits
7. Keep dependencies updated

## 📞 SUPPORT
- Supabase Docs: https://supabase.com/docs
- GitHub Issues: Create issue in your repo
- Security Issues: Email security@yourdomain.com
