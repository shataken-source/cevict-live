# Where To Vacation (WTV)

**Port:** 3003
**Domain:** wheretovacation.com (when deployed)

## Overview

WhereToVacation is a vacation planning and booking platform focused on:
- Vacation rental listings
- Hotel/condo bookings
- Activity packages
- Destination guides
- Restaurant recommendations

## Relationship with Gulf Coast Charters

WTV is the **sister site** to Gulf Coast Charters:
- **WTV**: Vacation planning and accommodations
- **GCC**: Charter fishing and boat rentals

They share:
- User authentication (SSO)
- Loyalty points system
- Cross-platform package deals
- Shared database for users/bookings

But are **separate projects** with their own:
- Codebases
- Deployment
- Domain
- Focus areas

## Quick Start

```bash
cd apps/wheretovacation
pnpm install
pnpm dev
# Runs on http://localhost:3003
```

## Project Structure

```
apps/wheretovacation/
├── app/              # Next.js app directory
│   ├── search/       # Destination search
│   ├── community/    # Community features
│   └── api/          # API routes
├── src/
│   ├── components/   # React components
│   ├── lib/          # Utilities
│   └── contexts/    # React contexts
└── docs/             # Documentation
```

## Features

- ✅ Vacation rental listings
- ✅ Search and filters
- ✅ Community features
- ⚠️ Booking system (needs payment integration)
- ⚠️ Activity packages (needs implementation)

## Integration Points

See `docs/CROSS_PLATFORM_INTEGRATION.md` for details on:
- Shared authentication
- Package deals with GCC
- Cross-platform bookings
- Unified loyalty program

## Note on GCC Features

This project currently contains some GCC-specific features that should be moved to `apps/gcc/`:
- Captain components (to be moved)
- Charter components (to be moved)
- Some booking components (GCC-specific ones)

See `PROJECT_SEPARATION.md` for migration plan.
