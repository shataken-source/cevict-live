# ⚡ Rate Limiting Setup Guide

## Overview
Configure rate limiting to prevent abuse and ensure fair usage of your API.

---

## Method 1: Supabase Dashboard (Recommended)

### Step 1: Navigate to API Settings
1. Go to **Supabase Dashboard**
2. Select your project
3. Click **Settings** > **API**

### Step 2: Configure Rate Limits
Set these limits:

```
Anonymous requests: 100 requests/minute
Authenticated requests: 200 requests/minute
Service role: Unlimited
```

### Step 3: Enable IP-based Rate Limiting
1. Go to **Settings** > **API** > **Rate Limiting**
2. Enable **IP-based rate limiting**
3. Set threshold: **100 requests per IP per minute**

---

## Method 2: Edge Function Rate Limiting

Add rate limiting to individual edge functions:

```typescript
// Rate limiter utility
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const limit = rateLimits.get(identifier);
  
  if (!limit || now > limit.resetTime) {
    rateLimits.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
}

// Usage in edge function
Deno.serve(async (req) => {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  if (!checkRateLimit(ip, 100, 60000)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: corsHeaders }
    );
  }
  
  // Process request...
});
```

---

## Method 3: Client-Side Rate Limiting

Add to `src/lib/rateLimiter.ts`:

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  canMakeRequest(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(t => now - t < windowMs);
    
    if (validTimestamps.length >= maxRequests) {
      return false;
    }
    
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }
}

export const rateLimiter = new RateLimiter();
```

Usage:
```typescript
if (!rateLimiter.canMakeRequest('api-call', 10, 60000)) {
  toast.error('Too many requests. Please wait.');
  return;
}
```

---

## Rate Limit Recommendations

### Public Endpoints
- Search: 60 requests/minute
- Charter listings: 100 requests/minute
- Reviews: 30 requests/minute

### Authenticated Endpoints
- Bookings: 20 requests/minute
- Profile updates: 10 requests/minute
- Messages: 30 requests/minute

### Admin Endpoints
- User management: 50 requests/minute
- Analytics: 100 requests/minute

---

## Monitoring Rate Limits

### Check Current Usage
```sql
SELECT 
  endpoint,
  COUNT(*) as request_count,
  DATE_TRUNC('minute', created_at) as minute
FROM api_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY endpoint, minute
ORDER BY minute DESC;
```

### Alert on High Usage
Set up alerts in Supabase Dashboard:
1. Go to **Logs** > **API**
2. Create alert for **>80% rate limit**
3. Send to email/Slack

---

## Troubleshooting

### Issue: Legitimate users getting rate limited
**Solution**: Increase limits for authenticated users

### Issue: Bot traffic overwhelming API
**Solution**: Enable IP-based blocking + CAPTCHA

### Issue: Rate limits not working
**Solution**: Check edge function has rate limit code deployed

---

## Best Practices

1. ✅ Set different limits for anon vs authenticated
2. ✅ Use exponential backoff on client
3. ✅ Log rate limit violations
4. ✅ Return 429 status with Retry-After header
5. ✅ Whitelist trusted IPs (payment processors)
6. ❌ Don't rate limit health checks
7. ❌ Don't use same limit for all endpoints
