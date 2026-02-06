# Captain Features Analysis
## Comprehensive Review of Existing vs Missing Captain Features

**Date:** 2026-01-27  
**Repositories Analyzed:** `c:\cevict-live\` and `c:\gcc\` (referenced)

---

## ✅ EXISTING CAPTAIN FEATURES

### 1. **Captain Dashboard Components** (`src/components/CaptainDashboard.tsx`)
**Status:** ✅ Implemented (but uses non-existent edge functions)

**Features Present:**
- Booking Management Panel
- Earnings Chart Panel  
- Customer Messaging Panel
- Document Upload Panel
- Enhanced Document Upload
- Captain Compliance Overview
- Captain Expiration Timeline
- Captain Document Purchase
- License Verification Panel
- Captain Availability Manager
- Last Minute Deals Manager
- Fleet Management
- Captain Availability Calendar
- Captain Performance Tracker
- Review Moderation
- Captain Alert Preferences
- Training Academy Dashboard
- Fishy AI Chat Integration

**Issues Found:**
- Uses `supabase.functions.invoke('captain-bookings')` - **EDGE FUNCTION DOES NOT EXIST**
- Uses `supabase.functions.invoke('captain-auth')` - **EDGE FUNCTION DOES NOT EXIST**
- Hardcoded `captainId = 'captain1'` - needs real auth context
- Many components reference edge functions that don't exist

---

### 2. **Captain Routes/Pages**

#### ✅ `/captains` - Captain Directory
- **File:** `pages/captains/index.js`
- **Status:** ✅ Working
- **Functionality:** Lists all captains from boats/vessels table
- **Uses:** `/api/boats` endpoint

#### ✅ `/captains/[id]` - Captain Profile
- **File:** `pages/captains/[id].tsx`
- **Status:** ✅ Working
- **Functionality:** Shows captain profile with booking options
- **Queries:** `captain_profiles`, `captains`, `vessels` tables

#### ✅ `/dashboard` - Unified Dashboard
- **File:** `pages/dashboard.tsx`
- **Status:** ✅ Working
- **Functionality:** Routes to `CaptainDashboardOptimized` if user is captain
- **Checks:** `captain_profiles` table for user_id

#### ✅ `/apply-captain` - Captain Application
- **File:** `pages/apply-captain.tsx`
- **Status:** ✅ Working
- **API:** `/api/captain/applications` (POST/GET)

#### ✅ `/admin/captain-review` - Admin Review
- **File:** `pages/admin/captain-review.tsx`
- **Status:** ✅ Working
- **API:** `/api/admin/captain-applications` (GET/POST)

#### ✅ `/captains/live/[captainId]` - Live Captain View
- **File:** `pages/captains/live/[captainId].tsx`
- **Status:** ✅ Exists (needs verification)

---

### 3. **Captain API Endpoints**

#### ✅ `/api/captain/applications`
- **File:** `pages/api/captain/applications/index.ts`
- **Methods:** GET, POST
- **Status:** ✅ Working
- **Functionality:** Submit/view captain applications

#### ✅ `/api/admin/captain-applications`
- **File:** `pages/api/admin/captain-applications/index.ts`
- **Methods:** GET, POST
- **Status:** ✅ Working
- **Functionality:** Admin review/approve/reject applications

#### ❌ `/api/captain/bookings` - **MISSING**
- **Expected:** GET bookings for captain
- **Current:** Referenced in dashboard but doesn't exist
- **Should:** Query `bookings` table filtered by captain_id

#### ❌ `/api/captain/earnings` - **MISSING**
- **Expected:** GET earnings analytics
- **Current:** Referenced in dashboard but doesn't exist
- **Should:** Calculate from bookings, payments, commissions

#### ❌ `/api/captain/availability` - **MISSING**
- **Expected:** GET/POST/PUT/DELETE availability
- **Current:** Uses edge function `availability-manager` (doesn't exist)
- **Should:** Use `calendar_availability` table directly

#### ❌ `/api/captain/documents` - **MISSING**
- **Expected:** GET/POST documents
- **Current:** Referenced but no dedicated endpoint
- **Should:** Use `captain_documents` table

#### ❌ `/api/captain/profile` - **MISSING**
- **Expected:** GET/PUT captain profile
- **Current:** No dedicated endpoint
- **Should:** Use `captain_profiles` table

---

### 4. **Database Tables**

#### ✅ `captain_profiles`
- **Status:** ✅ Exists
- **Schema:** Basic profile with user_id, rating, rates, specialties
- **Migration:** `20260119_captain_applications.sql`

#### ✅ `captain_applications`
- **Status:** ✅ Exists
- **Schema:** Application form data, status, admin review
- **Migration:** `20260119_captain_applications.sql`

#### ✅ `captains` (Legacy)
- **Status:** ✅ Exists (in some schemas)
- **Note:** May be duplicate of `captain_profiles`

#### ✅ `calendar_availability`
- **Status:** ✅ Exists
- **Schema:** Time slots, dates, status, booking_id
- **Migration:** `20260122_calendar_availability_system.sql`

#### ✅ `booking_holds`
- **Status:** ✅ Exists
- **Schema:** 15-minute holds during booking
- **Migration:** `20260122_calendar_availability_system.sql`

#### ❓ `captain_documents` - **NEEDS VERIFICATION**
- **Status:** Referenced in code but schema unclear
- **Should:** Store document URLs, types, expiration dates

#### ❓ `captain_earnings` - **NEEDS VERIFICATION**
- **Status:** May not exist as separate table
- **Should:** Track payments, commissions, payouts

---

### 5. **Captain Components (Detailed)**

#### ✅ Booking Management
- **File:** `src/components/captain/BookingManagementPanel.tsx`
- **Status:** ✅ Exists
- **Needs:** API endpoint to fetch bookings

#### ✅ Earnings Charts
- **File:** `src/components/captain/EarningsChartPanel.tsx`
- **Status:** ✅ Exists
- **Needs:** API endpoint to fetch earnings data

#### ✅ Customer Messaging
- **File:** `src/components/captain/CustomerMessagingPanel.tsx`
- **Status:** ✅ Exists
- **Needs:** Integration with messaging system

#### ✅ Document Upload
- **Files:** Multiple document upload components
- **Status:** ✅ Exists
- **Needs:** API endpoint for document uploads

#### ✅ Availability Management
- **Files:** Multiple availability components
- **Status:** ✅ Exists
- **Needs:** API endpoints (currently uses edge functions)

#### ✅ Compliance Overview
- **File:** `src/components/captain/CaptainComplianceOverview.tsx`
- **Status:** ✅ Exists
- **Needs:** Document expiration tracking

---

## ❌ MISSING CRITICAL FEATURES

### 1. **API Endpoints (High Priority)**

#### `/api/captain/bookings`
```typescript
// GET /api/captain/bookings?status=confirmed&startDate=2026-01-01&endDate=2026-12-31
// Should return bookings for authenticated captain
```

#### `/api/captain/earnings`
```typescript
// GET /api/captain/earnings?period=month&startDate=2026-01-01&endDate=2026-12-31
// Should return earnings breakdown, commissions, payouts
```

#### `/api/captain/availability`
```typescript
// GET /api/captain/availability?startDate=2026-01-01&endDate=2026-12-31
// POST /api/captain/availability (create/update availability)
// DELETE /api/captain/availability/:id
```

#### `/api/captain/documents`
```typescript
// GET /api/captain/documents
// POST /api/captain/documents (upload)
// DELETE /api/captain/documents/:id
```

#### `/api/captain/profile`
```typescript
// GET /api/captain/profile
// PUT /api/captain/profile (update profile)
```

#### `/api/captain/analytics`
```typescript
// GET /api/captain/analytics?period=month
// Should return booking stats, revenue, ratings, etc.
```

---

### 2. **Authentication & Authorization**

#### ❌ Captain-Specific Login Route
- **Current:** Uses generic `/admin/login`
- **Should:** `/captain/login` or `/captains/login`
- **Needs:** Role-based redirect to captain dashboard

#### ❌ Captain Route Protection
- **Current:** No middleware for captain routes
- **Should:** Protect `/dashboard` and captain-specific routes
- **Needs:** Check `captain_profiles` table for authorization

#### ❌ Captain Session Management
- **Current:** Generic auth session
- **Should:** Captain-specific session with role check

---

### 3. **Database Schema Gaps**

#### ❌ `captain_documents` Table
```sql
-- Should track:
-- - Document type (license, insurance, certification)
-- - File URL
-- - Expiration date
-- - Verification status
-- - Upload date
```

#### ❌ `captain_earnings` or Earnings Tracking
```sql
-- Should track:
-- - Booking revenue
-- - Platform commission
-- - Payout amount
-- - Payout status
-- - Payment date
```

#### ❌ `captain_settings` Table
```sql
-- Should store:
-- - Notification preferences
-- - Availability defaults
-- - Pricing rules
-- - Auto-booking settings
```

---

### 4. **Missing UI Features**

#### ❌ Captain Onboarding Flow
- **Current:** Basic onboarding component exists
- **Needs:** Complete flow from application → approval → setup

#### ❌ Captain Profile Editor
- **Current:** Profile display exists
- **Needs:** Full profile editing interface

#### ❌ Captain Settings Page
- **Current:** Scattered settings in dashboard
- **Needs:** Dedicated settings page

#### ❌ Captain Notifications Center
- **Current:** Alert preferences exist
- **Needs:** Notification history and management

#### ❌ Captain Reports/Analytics Dashboard
- **Current:** Basic analytics
- **Needs:** Comprehensive reporting with charts, exports

---

### 5. **Integration Gaps**

#### ❌ Stripe Payout Integration
- **Current:** Referenced but not implemented
- **Needs:** Connect Stripe for captain payouts

#### ❌ Email Notifications
- **Current:** Some email templates exist
- **Needs:** Complete email notification system for:
  - New bookings
  - Booking cancellations
  - Payment received
  - Document expiration warnings

#### ❌ SMS Notifications
- **Current:** SMS preferences exist
- **Needs:** Actual SMS sending integration

#### ❌ Calendar Sync (Google/Outlook)
- **Current:** Component exists but may not be fully functional
- **Needs:** Verify and complete integration

---

## 🔧 RECOMMENDED FIXES (Priority Order)

### **Priority 1: Critical (Blocks Core Functionality)**

1. **Create `/api/captain/bookings` endpoint**
   - Replace edge function calls
   - Query `bookings` table directly
   - Filter by authenticated captain

2. **Create `/api/captain/availability` endpoint**
   - Replace `availability-manager` edge function
   - Use `calendar_availability` table directly
   - Support CRUD operations

3. **Fix Captain Authentication**
   - Create `/captain/login` route
   - Add role-based redirect
   - Protect captain routes

4. **Create `/api/captain/earnings` endpoint**
   - Calculate from bookings
   - Include commission calculations
   - Support date range filtering

### **Priority 2: Important (Enhances Functionality)**

5. **Create `/api/captain/documents` endpoint**
   - Support document uploads
   - Track expiration dates
   - Link to compliance overview

6. **Create `/api/captain/profile` endpoint**
   - Allow profile updates
   - Validate captain data
   - Update `captain_profiles` table

7. **Create `captain_documents` table**
   - If doesn't exist, create migration
   - Link to captain_id
   - Track document metadata

8. **Create `/api/captain/analytics` endpoint**
   - Aggregate booking stats
   - Calculate revenue metrics
   - Return chart-ready data

### **Priority 3: Nice to Have (Polish)**

9. **Complete Email Notification System**
10. **Complete SMS Integration**
11. **Enhance Captain Onboarding**
12. **Add Captain Settings Page**
13. **Improve Analytics Dashboard**

---

## 📋 FILES TO CREATE/MODIFY

### **New API Endpoints Needed:**
```
pages/api/captain/
  ├── bookings.ts          [NEW - HIGH PRIORITY]
  ├── earnings.ts          [NEW - HIGH PRIORITY]
  ├── availability.ts      [NEW - HIGH PRIORITY]
  ├── documents.ts         [NEW - MEDIUM PRIORITY]
  ├── profile.ts           [NEW - MEDIUM PRIORITY]
  └── analytics.ts         [NEW - MEDIUM PRIORITY]
```

### **New Routes Needed:**
```
pages/
  ├── captain/
  │   ├── login.tsx        [NEW - HIGH PRIORITY]
  │   ├── settings.tsx     [NEW - MEDIUM PRIORITY]
  │   └── onboarding.tsx   [ENHANCE - LOW PRIORITY]
```

### **Database Migrations Needed:**
```
supabase/migrations/
  ├── YYYYMMDD_captain_documents.sql      [VERIFY/CREATE]
  ├── YYYYMMDD_captain_earnings.sql       [VERIFY/CREATE]
  └── YYYYMMDD_captain_settings.sql       [NEW]
```

### **Components to Fix:**
```
src/components/
  ├── CaptainDashboard.tsx                [FIX - Remove edge function calls]
  ├── CaptainAvailabilityManager.tsx      [FIX - Use API endpoint]
  └── captain/
      ├── BookingManagementPanel.tsx      [FIX - Use API endpoint]
      └── EarningsChartPanel.tsx          [FIX - Use API endpoint]
```

---

## 🎯 SUMMARY

**Total Captain Components Found:** 29+ files  
**Total Captain Routes Found:** 6 routes  
**Total Captain API Endpoints Found:** 2 endpoints  
**Missing Critical API Endpoints:** 6+ endpoints  
**Edge Functions Referenced (Don't Exist):** 3+ functions  

**Main Issue:** Dashboard and components are well-built but rely on non-existent edge functions. Need to replace with direct database queries via API endpoints.

**Estimated Work:** 
- High Priority: 4-6 hours
- Medium Priority: 4-6 hours  
- Low Priority: 4-6 hours
- **Total: 12-18 hours of focused development**

---

## 📝 NOTES

- Most components are well-structured and just need API endpoints
- Database schema is mostly complete
- Main gap is API layer between frontend and database
- Edge functions were planned but never created
- Direct database queries via API routes will be faster and more reliable
