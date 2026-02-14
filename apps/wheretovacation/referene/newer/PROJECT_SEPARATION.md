# Project Separation: WhereToVacation & Gulf Coast Charters

## Overview

**WhereToVacation** and **Gulf Coast Charters** are **sister sites** that work together but are **separate projects**.

## Project Structure

```
apps/
├── wheretovacation/     # Vacation planning & accommodations
│   ├── Port: 3003
│   ├── Domain: wheretovacation.com
│   └── Focus: Vacation rentals, hotels, activities
│
└── gcc/                  # Charter fishing & boat rentals
    ├── Port: 3004
    ├── Domain: gulfcoastcharters.com
    └── Focus: Charter fishing, boat rentals, captains
```

## What Each Project Contains

### WhereToVacation (`apps/wheretovacation/`)
**Self-contained except for GCC integration points**

**Core Features:**
- Vacation rental listings
- Hotel/condo bookings
- Activity packages
- Destination guides
- Restaurant recommendations
- Vacation planning tools

**GCC Integration Points:**
- Cross-platform package deals
- Shared authentication (SSO)
- Shared loyalty points
- Boat activity upsells

**Should NOT contain:**
- ❌ Captain-specific features (belongs in GCC)
- ❌ Charter booking system (belongs in GCC)
- ❌ USCG verification (belongs in GCC)
- ❌ Fishing-specific features (belongs in GCC)

### Gulf Coast Charters (`apps/gcc/`)
**Self-contained except for WTV integration points**

**Core Features:**
- Captain profiles and verification
- Charter boat listings
- Booking management
- Weather intelligence (NOAA)
- Tide predictions
- USCG QR verification system
- Fishing reports
- Community features (fishing-focused)

**WTV Integration Points:**
- Cross-platform package deals
- Shared authentication (SSO)
- Shared loyalty points
- Accommodation upsells

**Should NOT contain:**
- ❌ Vacation rental listings (belongs in WTV)
- ❌ Hotel bookings (belongs in WTV)
- ❌ General vacation planning (belongs in WTV)

## Current Issues

### WhereToVacation Contains GCC Features
Currently, `wheretovacation` has many GCC-specific features mixed in:
- ✅ Captain components (`src/components/captain/`)
- ✅ Charter components (`src/components/Charter*.tsx`)
- ✅ Booking components (some are GCC-specific)
- ✅ Weather dashboard (should be in both, but GCC-focused)

**Action Needed:**
1. Move GCC-specific components to `apps/gcc/`
2. Keep shared components in a shared package (future)
3. Update imports and references

## Integration Architecture

### Shared Services (Future)
```
packages/
├── shared-auth/         # SSO authentication
├── shared-database/     # Database client
├── shared-payments/     # Stripe integration
└── shared-loyalty/      # Points system
```

### Current Integration
- **Database**: Shared Supabase project
- **Auth**: Shared Supabase Auth (SSO)
- **API**: Cross-platform API calls
- **UI**: Separate Next.js apps

## Separation Checklist

### For WhereToVacation:
- [x] Remove PetReunion (completed)
- [ ] Move GCC-specific captain features to GCC
- [ ] Move GCC-specific charter features to GCC
- [ ] Keep only WTV vacation planning features
- [ ] Add GCC integration points (package deals, upsells)

### For Gulf Coast Charters:
- [x] Create project structure (completed)
- [ ] Move captain components from WTV
- [ ] Move charter components from WTV
- [ ] Move booking components (GCC-specific)
- [ ] Move weather/tide features
- [ ] Add WTV integration points (accommodation upsells)

## Running Both Projects

### Development
```bash
# Terminal 1: WhereToVacation
cd apps/wheretovacation
pnpm dev
# Runs on http://localhost:3003

# Terminal 2: Gulf Coast Charters
cd apps/gcc
pnpm dev
# Runs on http://localhost:3004
```

### Production
- **WTV**: Deployed to `wheretovacation.com`
- **GCC**: Deployed to `gulfcoastcharters.com`
- **Shared API**: Can be deployed separately or as part of one project

## Cross-Platform Features

### Package Deals
Users can book:
- Vacation rental (WTV) + Fishing charter (GCC) = 15% discount
- Hotel (WTV) + Boat rental (GCC) = 10% discount

### Shared Authentication
- One account works on both sites
- SSO via Supabase Auth
- Shared user profile

### Loyalty Points
- Earn points on both platforms
- Redeem on either platform
- Bonus points for package deals

## Next Steps

1. **Immediate:**
   - ✅ Create GCC project structure
   - ⚠️ Move GCC components from WTV to GCC
   - ⚠️ Update imports and references

2. **Short Term:**
   - Set up shared authentication
   - Implement package deal system
   - Create cross-platform API

3. **Long Term:**
   - Create shared packages
   - Unified mobile app
   - Advanced integration features

## Documentation

- **WTV**: `apps/wheretovacation/README.md`
- **GCC**: `apps/gcc/README.md`
- **Integration**: `apps/wheretovacation/docs/CROSS_PLATFORM_INTEGRATION.md`

