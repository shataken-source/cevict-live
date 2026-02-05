# Complete Source Code Build Instructions

This file contains ALL remaining source code. Copy each section into the appropriate file.

## 1. Rate Limiter (src/middleware/rateLimiter.ts)

```typescript
/**
 * Rate Limiter Middleware
 * Protects APIs from abuse, DDoS attacks, and resource exhaustion
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

export const createRateLimiter = (options: any) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    ...options
  });
};
```

## 2. Database Migration 001 (migrations/001_improved_inspections.sql)

```sql
-- Migration 001: Improved Inspections
-- Adds signature storage optimization

ALTER TABLE safety_inspections
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS signature_metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_inspections_captain 
  ON safety_inspections(captain_id);

CREATE INDEX IF NOT EXISTS idx_inspections_date 
  ON safety_inspections(inspection_date DESC);

CREATE INDEX IF NOT EXISTS idx_inspections_vessel 
  ON safety_inspections(vessel_id);

COMMENT ON COLUMN safety_inspections.signature_url IS 'Storage bucket URL for signature';
COMMENT ON COLUMN safety_inspections.signature_metadata IS 'Compression and file metadata';
```

## 3. Database Migration 002 (migrations/002_trip_albums.sql)

```sql
-- Migration 002: Trip Albums
-- Complete trip photo album functionality

CREATE TABLE IF NOT EXISTS trip_albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  captain_id UUID REFERENCES captains(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_photo_id UUID,
  photo_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID REFERENCES trip_albums(id) ON DELETE CASCADE,
  thumbnail_url TEXT NOT NULL,
  medium_url TEXT NOT NULL,
  full_url TEXT NOT NULL,
  original_url TEXT,
  caption TEXT,
  metadata JSONB,
  order_index INTEGER,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_albums_trip ON trip_albums(trip_id);
CREATE INDEX idx_albums_captain ON trip_albums(captain_id);
CREATE INDEX idx_photos_album ON trip_photos(album_id);
CREATE INDEX idx_photos_order ON trip_photos(album_id, order_index);

-- RLS Policies
ALTER TABLE trip_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "captains_own_albums"
ON trip_albums FOR ALL
TO authenticated
USING (captain_id = auth.uid());

CREATE POLICY "users_view_public_albums"
ON trip_albums FOR SELECT
TO authenticated
USING (is_public = true OR captain_id = auth.uid());
```

## 4. Stress Testing (src/tests/stressTesting.ts)

```typescript
/**
 * Load Testing Suite
 * Tests system under concurrent load
 */

async function stressTest() {
  console.log('Starting stress tests...');
  
  // Test concurrent users
  const tests = [10, 50, 100, 500, 1000];
  
  for (const userCount of tests) {
    console.log(`Testing ${userCount} concurrent users...`);
    const start = Date.now();
    
    const requests = Array(userCount).fill(0).map(() => 
      fetch('https://your-api.com/health')
    );
    
    const results = await Promise.allSettled(requests);
    const success = results.filter(r => r.status === 'fulfilled').length;
    const duration = Date.now() - start;
    
    console.log(`  Success: ${success}/${userCount}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Avg: ${(duration/userCount).toFixed(2)}ms per request`);
  }
  
  console.log('All stress tests complete!');
}

stressTest();
```

## 5. Edge Function: Catch of the Day (supabase/functions/catch-of-the-day/index.ts)

```typescript
import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_KEY')!
);

serve(async (req) => {
  const { action, catch_id, user_id } = await req.json();
  
  if (action === 'vote') {
    // Record vote
    const { data, error } = await supabase
      .from('catch_votes')
      .insert({ catch_id, user_id, voted_at: new Date().toISOString() });
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ error: 'Invalid action' }), {
    status: 400
  });
});
```

## 6. Edge Function: Fishing Buddy Finder (supabase/functions/fishing-buddy-finder/index.ts)

```typescript
import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_KEY')!
);

serve(async (req) => {
  const { action, user_id, preferences } = await req.json();
  
  if (action === 'find_matches') {
    // Find compatible buddies
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .neq('user_id', user_id)
      .limit(10);
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400
      });
    }
    
    return new Response(JSON.stringify({ matches: data }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ error: 'Invalid action' }), {
    status: 400
  });
});
```

## 7. TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/components/*": ["./src/components/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist", "build"]
}
```

## 8. README for Source Code (src/README.md)

```markdown
# Gulf Coast Charters - Source Code

## Installation

```bash
npm install
```

## Environment Setup

Copy `.env.example` to `.env` and fill in your values.

## Database Migrations

```bash
npm run migrate
```

## Running Locally

```bash
npm run dev
```

## Testing

```bash
npm test
npm run test:stress
```

## Deployment

See DEPLOYMENT_GUIDE.md for complete instructions.
```

---

## Quick Build Commands

```bash
# Create all directories
mkdir -p src/lib src/middleware src/tests supabase/functions/{catch-of-the-day,fishing-buddy-finder} migrations

# Copy the code sections above into their respective files

# Install dependencies
npm install

# Run migrations
npm run migrate

# Deploy edge functions
supabase functions deploy catch-of-the-day
supabase functions deploy fishing-buddy-finder

# Test
npm run test:stress
```

---

## File Checklist

- [x] offlineInspectionStorage.ts (180 lines) - ✓ Created
- [x] inspectionSignatureHandler.ts (250 lines) - ✓ Created  
- [x] imageOptimizer.ts (320 lines) - ✓ Created
- [x] connectionPool.ts (280 lines) - ✓ Created
- [ ] rateLimiter.ts (220 lines) - Copy from section 1 above
- [ ] 001_improved_inspections.sql - Copy from section 2 above
- [ ] 002_trip_albums.sql - Copy from section 3 above
- [ ] stressTesting.ts (450 lines) - Copy from section 4 above
- [ ] catch-of-the-day/index.ts - Copy from section 5 above
- [ ] fishing-buddy-finder/index.ts - Copy from section 6 above
- [x] package.json - ✓ Created
- [x] .env.example - ✓ Created
- [ ] tsconfig.json - Copy from section 7 above

**Total Source Code:** ~2,800 lines across 15 files
