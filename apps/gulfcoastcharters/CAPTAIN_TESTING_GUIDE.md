# Captain Features Testing Guide

## 🚀 Quick Start Testing

### Step 1: Verify You Have a Captain Profile

Before testing, you need to ensure your user account has a captain profile in the database.

**Option A: Check via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to Table Editor → `captain_profiles`
3. Find a row where `user_id` matches your auth user ID
4. If none exists, you'll need to create one (see Step 2)

**Option B: Check via SQL**
```sql
-- Replace 'your-email@example.com' with your actual email
SELECT 
  cp.id as captain_profile_id,
  cp.user_id,
  au.email,
  cp.status,
  cp.boat_name
FROM captain_profiles cp
JOIN auth.users au ON au.id = cp.user_id
WHERE au.email = 'your-email@example.com';
```

### Step 2: Create Captain Profile (If Needed)

If you don't have a captain profile, create one:

**Option A: Via SQL**
```sql
-- Replace 'your-user-id' with your actual auth.users.id UUID
INSERT INTO captain_profiles (user_id, status, boat_name)
VALUES (
  'your-user-id'::uuid,
  'active',
  'Test Boat'
);
```

**Option B: Via Application**
- Navigate to `/apply-captain` (if that route exists)
- Or use the admin panel to approve a captain application

### Step 3: Access the Captain Dashboard

**Routes to Test:**
1. `/dashboard` - Main captain dashboard
2. `/captains` - Captain listing page (may redirect)
3. `/captains/[id]` - Individual captain profile

**Direct Navigation:**
- Open your browser to: `http://localhost:3000/dashboard` (or your dev URL)
- Make sure you're logged in as a user with a captain profile

### Step 4: Test API Endpoints Directly

You can test the API endpoints using your browser's developer console or a tool like Postman.

#### Test 1: Get Bookings
```javascript
// In browser console (while logged in)
fetch('/api/captain/bookings')
  .then(r => r.json())
  .then(console.log);
```

#### Test 2: Get Analytics
```javascript
fetch('/api/captain/analytics')
  .then(r => r.json())
  .then(console.log);
```

#### Test 3: Get Earnings
```javascript
fetch('/api/captain/earnings')
  .then(r => r.json())
  .then(console.log);
```

#### Test 4: Get Availability
```javascript
fetch('/api/captain/availability')
  .then(r => r.json())
  .then(console.log);
```

#### Test 5: Get Profile
```javascript
fetch('/api/captain/profile')
  .then(r => r.json())
  .then(console.log);
```

### Step 5: Test UI Components

#### Dashboard Features to Test:
1. **Bookings List**
   - Should load bookings for your captain profile
   - Try filtering by status (pending, confirmed, completed)
   - Try date range filters

2. **Analytics Cards**
   - Check if revenue, bookings count, etc. display correctly
   - Verify numbers match your actual bookings

3. **Earnings Panel**
   - Check total earnings calculation
   - Verify pending payout amount
   - Test "Request Payout" button (will show alert for now)

4. **Availability Manager**
   - Select a date
   - Add/edit time slots
   - Block dates
   - Save and verify it persists

5. **Booking Actions**
   - Accept a pending booking
   - Decline a pending booking
   - Update booking status
   - Add notes to a booking

### Step 6: Check for Errors

**Common Issues to Watch For:**

1. **"User is not a captain" Error**
   - **Fix:** Create captain profile (Step 2)

2. **"No bookings found"**
   - **Check:** Do you have bookings in the database with `captain_id` matching your `captain_profiles.id`?
   - **Fix:** Create a test booking:
     ```sql
     INSERT INTO bookings (
       user_id,
       captain_id,
       booking_date,
       total_price,
       status
     ) VALUES (
       'some-user-id'::uuid,  -- Any user ID
       'your-captain-profile-id'::uuid,  -- Your captain_profiles.id
       CURRENT_DATE + INTERVAL '7 days',
       500.00,
       'pending'
     );
     ```

3. **"captain_id doesn't match"**
   - **Check:** Verify `bookings.captain_id` references `captain_profiles.id`
   - **Fix:** The API has fallback logic, but you may need to update existing bookings:
     ```sql
     -- Update bookings to use correct captain_id
     UPDATE bookings b
     SET captain_id = cp.id
     FROM captain_profiles cp
     WHERE b.captain_id = cp.user_id;  -- If bookings were using user_id instead
     ```

4. **Empty/Crash on Dashboard Load**
   - **Check:** Browser console for errors
   - **Check:** Network tab for failed API calls
   - **Fix:** Verify captain profile exists and API endpoints are accessible

### Step 7: Test Edge Cases

1. **No Bookings**
   - Dashboard should show empty state, not crash

2. **Different Booking Statuses**
   - Test filtering by each status

3. **Date Range Filtering**
   - Test with start date only
   - Test with end date only
   - Test with both

4. **Availability Management**
   - Create availability for today
   - Create availability for future dates
   - Block a date
   - Delete availability

### Step 8: Verify Data Integrity

After making changes via the UI, verify in database:

```sql
-- Check bookings were updated
SELECT id, status, updated_at 
FROM bookings 
WHERE captain_id = 'your-captain-id'::uuid
ORDER BY updated_at DESC
LIMIT 10;

-- Check availability was created
SELECT * 
FROM calendar_availability 
WHERE captain_id = 'your-captain-id'::uuid
ORDER BY date DESC;
```

---

## 🐛 Debugging Tips

### Enable Console Logging
The API endpoints log errors to the server console. Check your Next.js dev server terminal for:
- `Error fetching bookings: ...`
- `Using captain_profiles.id for captain_id`
- `Error in GET /api/captain/bookings: ...`

### Check Network Requests
1. Open browser DevTools → Network tab
2. Filter by "captain"
3. Click on each request to see:
   - Request URL
   - Request payload
   - Response status
   - Response body

### Verify Authentication
```javascript
// In browser console
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
```

### Verify Captain Profile
```javascript
// In browser console
const { data: profile } = await supabase
  .from('captain_profiles')
  .select('*')
  .eq('user_id', user.id)
  .single();
console.log('Captain profile:', profile);
```

---

## ✅ Success Criteria

You'll know everything is working when:

1. ✅ Dashboard loads without errors
2. ✅ Bookings list displays (even if empty)
3. ✅ Analytics show numbers (even if zeros)
4. ✅ Earnings panel displays
5. ✅ Availability manager allows creating/editing slots
6. ✅ Booking actions (accept/decline) work
7. ✅ No console errors in browser
8. ✅ No errors in Next.js server logs

---

## 📝 Quick Test Checklist

- [ ] Logged in as user with captain profile
- [ ] Can access `/dashboard` route
- [ ] Dashboard loads without crashing
- [ ] Bookings API returns data (or empty array)
- [ ] Analytics API returns data
- [ ] Earnings API returns data
- [ ] Availability API works
- [ ] Can accept a booking
- [ ] Can decline a booking
- [ ] Can update booking status
- [ ] Can create availability slots
- [ ] Can block dates

---

**Need Help?** Check the browser console and Next.js server logs for specific error messages, then refer to the "Common Issues" section above.
