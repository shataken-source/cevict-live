# 🚀 API QUICK REFERENCE

## Overview

Quick reference for all API endpoints, parameters, and responses.

**Base URL:** `https://[your-project].supabase.co`

---

## 🔐 Authentication

All API requests require authentication via JWT token:

```http
Authorization: Bearer {your-jwt-token}
```

Get token:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## 📋 Inspections API

### Create Inspection

```http
POST /rest/v1/safety_inspections
Content-Type: application/json
Authorization: Bearer {token}

{
  "vessel_id": "uuid",
  "captain_id": "uuid",
  "inspection_date": "2024-11-22",
  "inspection_type": "pre_trip",
  "checklist": {
    "life_jackets": true,
    "fire_extinguisher": true,
    "flares": true
  },
  "notes": "All systems operational",
  "status": "completed"
}

Response 201:
{
  "id": "uuid",
  "vessel_id": "uuid",
  "captain_id": "uuid",
  "created_at": "2024-11-22T10:30:00Z"
}
```

### Upload Signature

```typescript
import { inspectionSignatureHandler } from '@/lib/inspectionSignatureHandler';

const result = await inspectionSignatureHandler.uploadSignature({
  inspectionId: 'uuid',
  signatureDataUrl: 'data:image/png;base64,...',
  captainId: 'uuid'
});

// Returns:
{
  success: true,
  url: "https://[...]/storage/v1/object/inspection_signatures/...",
  size: 48536,
  metadata: {
    originalSize: 204800,
    compressionRatio: 4.2,
    format: "png"
  }
}
```

### Get Inspection

```http
GET /rest/v1/safety_inspections?id=eq.{uuid}
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "vessel_id": "uuid",
  "captain_id": "uuid",
  "inspection_date": "2024-11-22",
  "checklist": {...},
  "signature_url": "https://...",
  "status": "completed"
}
```

### List Inspections

```http
GET /rest/v1/safety_inspections?captain_id=eq.{uuid}&order=inspection_date.desc&limit=20
Authorization: Bearer {token}

Response 200:
[
  {
    "id": "uuid",
    "vessel_id": "uuid",
    "inspection_date": "2024-11-22",
    ...
  },
  ...
]
```

### Update Inspection

```http
PATCH /rest/v1/safety_inspections?id=eq.{uuid}
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "amended",
  "notes": "Updated notes"
}

Response 200:
{
  "id": "uuid",
  "status": "amended",
  "updated_at": "2024-11-22T11:00:00Z"
}
```

---

## 🖼️ Trip Albums API

### Create Album

```http
POST /rest/v1/trip_albums
Content-Type: application/json
Authorization: Bearer {token}

{
  "trip_id": "uuid",
  "captain_id": "uuid",
  "title": "Summer Fishing 2024",
  "description": "Amazing day on the water!",
  "is_public": false
}

Response 201:
{
  "id": "uuid",
  "trip_id": "uuid",
  "title": "Summer Fishing 2024",
  "photo_count": 0,
  "created_at": "2024-11-22T10:30:00Z"
}
```

### Upload Photos

```typescript
import { imageOptimizer } from '@/lib/imageOptimizer';

// Optimize image
const optimized = await imageOptimizer.optimizeImage(file, {
  quality: 85,
  maxWidth: 1920
});

// Upload to storage
const { data, error } = await supabase.storage
  .from('trip_photos')
  .upload(`${albumId}/${optimized.filename}`, optimized.buffer);

// Create database record
await supabase
  .from('trip_photos')
  .insert({
    album_id: albumId,
    thumbnail_url: optimized.thumbnail.url,
    medium_url: optimized.medium.url,
    full_url: optimized.full.url,
    caption: 'Great catch!'
  });
```

### Get Album with Photos

```http
GET /rest/v1/trip_albums?id=eq.{uuid}&select=*,trip_photos(*)
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "title": "Summer Fishing 2024",
  "photo_count": 12,
  "trip_photos": [
    {
      "id": "uuid",
      "thumbnail_url": "https://...",
      "full_url": "https://...",
      "caption": "Great catch!"
    },
    ...
  ]
}
```

### Update Album

```http
PATCH /rest/v1/trip_albums?id=eq.{uuid}
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Updated Title",
  "cover_photo_id": "uuid",
  "is_public": true
}

Response 200:
{
  "id": "uuid",
  "title": "Updated Title",
  "cover_photo_id": "uuid",
  "is_public": true,
  "updated_at": "2024-11-22T11:00:00Z"
}
```

### Delete Photo

```http
DELETE /rest/v1/trip_photos?id=eq.{uuid}
Authorization: Bearer {token}

Response 204: No Content
```

---

## 🏆 Community API

### Catch of the Day - Get Current

```http
POST /functions/v1/catch-of-the-day
Content-Type: application/json
Authorization: Bearer {token}

{
  "action": "get_current"
}

Response 200:
{
  "catch": {
    "id": "uuid",
    "user_id": "uuid",
    "username": "CaptainMike",
    "species": "Red Snapper",
    "weight": 24.5,
    "image_url": "https://...",
    "votes": 47,
    "submitted_at": "2024-11-22T08:00:00Z"
  },
  "has_voted": false
}
```

### Catch of the Day - Vote

```http
POST /functions/v1/catch-of-the-day
Content-Type: application/json
Authorization: Bearer {token}

{
  "action": "vote",
  "catch_id": "uuid",
  "user_id": "uuid"
}

Response 200:
{
  "success": true,
  "votes": 48,
  "user_voted": true,
  "message": "Vote recorded successfully"
}

Response 400 (already voted):
{
  "error": "Already voted",
  "message": "You have already voted on this catch today"
}
```

### Catch of the Day - Submit

```http
POST /functions/v1/catch-of-the-day
Content-Type: application/json
Authorization: Bearer {token}

{
  "action": "submit",
  "user_id": "uuid",
  "species": "Mahi Mahi",
  "weight": 32.8,
  "length": 48,
  "location": "30.2732,-87.5928",
  "image_url": "https://...",
  "story": "Caught after 45 minute fight!"
}

Response 201:
{
  "success": true,
  "catch_id": "uuid",
  "message": "Catch submitted successfully"
}
```

### Catch of the Day - Leaderboard

```http
POST /functions/v1/catch-of-the-day
Content-Type: application/json
Authorization: Bearer {token}

{
  "action": "get_leaderboard",
  "period": "week"  // week, month, all_time
}

Response 200:
{
  "leaderboard": [
    {
      "rank": 1,
      "catch_id": "uuid",
      "username": "CaptainMike",
      "species": "Red Snapper",
      "weight": 24.5,
      "votes": 156,
      "image_url": "https://..."
    },
    ...
  ]
}
```

---

## 🤝 Fishing Buddy Finder API

### Find Matches

```http
POST /functions/v1/fishing-buddy-finder
Content-Type: application/json
Authorization: Bearer {token}

{
  "action": "find_matches",
  "user_id": "uuid",
  "preferences": {
    "fishing_type": ["inshore", "offshore"],
    "skill_level": "intermediate",
    "location": {
      "lat": 30.2732,
      "lng": -87.5928
    },
    "max_distance": 50,
    "availability": ["weekends"]
  }
}

Response 200:
{
  "matches": [
    {
      "user_id": "uuid",
      "username": "FishingBuddy1",
      "compatibility_score": 0.89,
      "shared_interests": ["offshore", "tournament"],
      "distance": 12.3,
      "profile_image": "https://...",
      "bio": "Love offshore fishing..."
    },
    ...
  ]
}
```

### Send Buddy Request

```http
POST /functions/v1/fishing-buddy-finder
Content-Type: application/json
Authorization: Bearer {token}

{
  "action": "send_request",
  "from_user_id": "uuid",
  "to_user_id": "uuid",
  "message": "Let's go fishing sometime!"
}

Response 201:
{
  "success": true,
  "request_id": "uuid",
  "message": "Request sent successfully"
}
```

### Accept Request

```http
POST /functions/v1/fishing-buddy-finder
Content-Type: application/json
Authorization: Bearer {token}

{
  "action": "accept_request",
  "request_id": "uuid",
  "user_id": "uuid"
}

Response 200:
{
  "success": true,
  "buddy_id": "uuid",
  "message": "Request accepted. You are now buddies!"
}
```

### Get Buddies

```http
POST /functions/v1/fishing-buddy-finder
Content-Type: application/json
Authorization: Bearer {token}

{
  "action": "get_buddies",
  "user_id": "uuid"
}

Response 200:
{
  "buddies": [
    {
      "buddy_id": "uuid",
      "username": "CaptainMike",
      "profile_image": "https://...",
      "connected_since": "2024-10-15T10:00:00Z",
      "trips_together": 5,
      "last_trip": "2024-11-20T08:00:00Z"
    },
    ...
  ]
}
```

---

## 💾 Offline Storage API

### Save Inspection Offline

```typescript
import { offlineInspectionStorage } from '@/lib/offlineInspectionStorage';

await offlineInspectionStorage.saveInspection({
  id: 'temp-uuid',
  vessel_id: 'uuid',
  captain_id: 'uuid',
  inspection_date: new Date(),
  checklist: {...},
  timestamp: Date.now()
});

// Returns: void (throws on error)
```

### Get Offline Inspection

```typescript
const inspection = await offlineInspectionStorage.getInspection('temp-uuid');

// Returns:
{
  id: 'temp-uuid',
  vessel_id: 'uuid',
  captain_id: 'uuid',
  inspection_date: Date,
  checklist: {...},
  timestamp: 1700000000000
}
```

### Get All Offline Inspections

```typescript
const inspections = await offlineInspectionStorage.getAllInspections();

// Returns: Array of inspection objects
```

### Sync to Server

```typescript
const result = await offlineInspectionStorage.syncToServer();

// Returns:
{
  synced: 5,
  failed: 0,
  errors: []
}
```

### Clear Synced Data

```typescript
await offlineInspectionStorage.clearInspection('temp-uuid');
// or
await offlineInspectionStorage.clearAllSynced();
```

---

## 🗄️ Database Connection Pool

### Execute Query

```typescript
import { connectionPool } from '@/lib/connectionPool';

const result = await connectionPool.query(
  'SELECT * FROM safety_inspections WHERE captain_id = $1',
  ['uuid']
);

// Returns: { rows: [...], rowCount: number }
```

### Execute Transaction

```typescript
await connectionPool.transaction(async (client) => {
  // All queries use same connection
  await client.query('INSERT INTO inspections VALUES ($1, $2)', [1, 2]);
  await client.query('UPDATE vessels SET last_inspection = $1', [Date.now()]);
  // Auto-commit on success, rollback on error
});
```

### Get Pool Stats

```typescript
const stats = connectionPool.getStats();

// Returns:
{
  totalConnections: 45,
  idleConnections: 12,
  activeConnections: 33,
  waitingClients: 0,
  maxConnections: 100
}
```

### Health Check

```typescript
const health = await connectionPool.healthCheck();

// Returns:
{
  healthy: true,
  latency: 23,  // ms
  timestamp: 1700000000000
}
```

---

## 🖼️ Image Optimizer

### Optimize Single Image

```typescript
import { imageOptimizer } from '@/lib/imageOptimizer';

const result = await imageOptimizer.optimizeImage(file, {
  quality: 85,
  maxWidth: 1920,
  maxHeight: 1080,
  format: 'jpeg'
});

// Returns:
{
  thumbnail: {
    url: 'https://...',
    width: 150,
    height: 150,
    size: 18432
  },
  medium: {
    url: 'https://...',
    width: 800,
    height: 600,
    size: 204800
  },
  full: {
    url: 'https://...',
    width: 1920,
    height: 1080,
    size: 819200
  },
  metadata: {
    originalSize: 10485760,
    totalCompressedSize: 1042432,
    compressionRatio: 10.06,
    savedBytes: 9443328
  }
}
```

### Optimize Batch

```typescript
const results = await imageOptimizer.optimizeBatch(files, options);

// Returns: Array of optimization results
```

### Convert to WebP

```typescript
const webpBuffer = await imageOptimizer.convertToWebP(imageBuffer);
```

---

## 🛡️ Rate Limiter

### Check Rate Limit

```typescript
import { rateLimiter } from '@/middleware/rateLimiter';

// Applied as middleware
app.use(rateLimiter);

// Or check manually
const info = await rateLimiter.getRateLimitInfo(req.ip);

// Returns:
{
  limit: 100,
  remaining: 87,
  reset: 1700000000,  // Unix timestamp
  retryAfter: 840  // seconds
}
```

### Custom Rate Limiter

```typescript
import { createRateLimiter } from '@/middleware/rateLimiter';

const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests'
});

app.post('/api/upload', strictLimiter, handler);
```

### Ban IP

```typescript
await rateLimiter.banIP('192.168.1.100', {
  duration: 86400000,  // 24 hours
  reason: 'Abuse detected'
});
```

---

## ⚠️ Error Responses

### Standard Error Format

```json
{
  "error": "Error Type",
  "message": "Human-readable description",
  "code": "ERROR_CODE",
  "timestamp": "2024-11-22T10:30:00Z",
  "request_id": "uuid"
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 204 | No Content | Delete successful, no return data |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | Temporary downtime |

---

## 📊 Response Headers

### Standard Headers

```
Content-Type: application/json
X-Request-ID: uuid
X-Response-Time: 234ms
```

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1700000000
Retry-After: 840
```

### Pagination Headers

```
X-Total-Count: 156
X-Page: 1
X-Per-Page: 20
X-Total-Pages: 8
Link: <url>; rel="next"
```

---

## 🔍 Query Parameters

### Filtering

```http
# Equal
GET /rest/v1/inspections?status=eq.completed

# Not equal
GET /rest/v1/inspections?status=neq.pending

# Greater than
GET /rest/v1/inspections?created_at=gt.2024-11-01

# Less than
GET /rest/v1/inspections?created_at=lt.2024-12-01

# In list
GET /rest/v1/inspections?status=in.(completed,approved)

# Like (pattern matching)
GET /rest/v1/vessels?name=like.*Fishing*

# Is null
GET /rest/v1/inspections?notes=is.null
```

### Sorting

```http
# Ascending
GET /rest/v1/inspections?order=created_at.asc

# Descending
GET /rest/v1/inspections?order=created_at.desc

# Multiple columns
GET /rest/v1/inspections?order=status.asc,created_at.desc
```

### Pagination

```http
# Limit
GET /rest/v1/inspections?limit=20

# Offset
GET /rest/v1/inspections?limit=20&offset=40

# Range (preferred)
GET /rest/v1/inspections
Range: 0-19
```

### Selecting Columns

```http
# Specific columns
GET /rest/v1/inspections?select=id,vessel_id,status

# Related data
GET /rest/v1/inspections?select=*,vessel(name,type)

# Nested relations
GET /rest/v1/trips?select=*,albums(title,photo_count,photos(*))
```

---

## 🚀 WebSocket (Real-time)

### Subscribe to Changes

```typescript
const subscription = supabase
  .channel('inspections')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'safety_inspections',
      filter: 'captain_id=eq.uuid'
    },
    (payload) => {
      console.log('New inspection:', payload.new);
    }
  )
  .subscribe();

// Unsubscribe
subscription.unsubscribe();
```

### Real-time Presence

```typescript
const channel = supabase.channel('trip:123');

// Track presence
channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('Online users:', Object.keys(state));
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        user_id: 'uuid',
        online_at: new Date().toISOString()
      });
    }
  });
```

---

## 🔐 Security Best Practices

### Always Use Prepared Statements

```typescript
// ❌ Bad - SQL injection risk
const result = await pool.query(
  `SELECT * FROM inspections WHERE id = '${userId}'`
);

// ✅ Good - safe from injection
const result = await pool.query(
  'SELECT * FROM inspections WHERE id = $1',
  [userId]
);
```

### Validate Input

```typescript
// Validate before using
import { z } from 'zod';

const inspectionSchema = z.object({
  vessel_id: z.string().uuid(),
  inspection_date: z.string().datetime(),
  checklist: z.object({}).passthrough()
});

const validated = inspectionSchema.parse(req.body);
```

### Use RLS Policies

```sql
-- Always enable RLS
ALTER TABLE safety_inspections ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "users_own_data"
ON safety_inspections
USING (captain_id = auth.uid());
```

---

## 📈 Performance Tips

### Use Indexes

```sql
-- Add indexes for common queries
CREATE INDEX idx_inspections_captain_date 
ON safety_inspections(captain_id, inspection_date DESC);
```

### Batch Requests

```typescript
// ❌ Bad - N+1 queries
for (const id of ids) {
  await getInspection(id);
}

// ✅ Good - single query
const inspections = await pool.query(
  'SELECT * FROM inspections WHERE id = ANY($1)',
  [ids]
);
```

### Cache Responses

```typescript
// Use Redis or LRU cache
const cached = await cache.get(key);
if (cached) return cached;

const data = await fetchData();
await cache.set(key, data, { ttl: 300 });
```

---

## 🔗 Related Documentation

- **Complete API Docs:** README.md
- **Deployment Guide:** DEPLOYMENT_GUIDE.md
- **Troubleshooting:** TROUBLESHOOTING_GUIDE.md
- **Supabase API:** https://supabase.com/docs/reference/javascript

---

**Last Updated:** November 2025  
**Version:** 1.0.0  
**Base URL:** Update with your project URL
