# Database Performance Optimization Guide

## Overview
This guide covers all database indexes and optimizations needed for enterprise-scale performance with 1000s of users.

## Critical Indexes for Performance

### Users Table
```sql
-- Index for email lookups (login)
CREATE INDEX idx_users_email ON users(email);

-- Index for user role filtering
CREATE INDEX idx_users_role ON users(role);

-- Index for active user queries
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Composite index for admin user management
CREATE INDEX idx_users_role_created ON users(role, created_at DESC);
```

### Bookings Table
```sql
-- Index for customer bookings lookup
CREATE INDEX idx_bookings_user_id ON bookings(user_id);

-- Index for captain bookings lookup
CREATE INDEX idx_bookings_captain_id ON bookings(captain_id);

-- Index for charter bookings lookup
CREATE INDEX idx_bookings_charter_id ON bookings(charter_id);

-- Index for date range queries
CREATE INDEX idx_bookings_booking_date ON bookings(booking_date);

-- Index for status filtering
CREATE INDEX idx_bookings_status ON bookings(status);

-- Composite index for captain dashboard
CREATE INDEX idx_bookings_captain_date ON bookings(captain_id, booking_date DESC);

-- Composite index for customer dashboard
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status, booking_date DESC);
```

### Charters Table
```sql
-- Index for captain charters lookup
CREATE INDEX idx_charters_captain_id ON charters(captain_id);

-- Index for location-based searches
CREATE INDEX idx_charters_location ON charters(location);

-- Index for price filtering
CREATE INDEX idx_charters_price ON charters(price);

-- Index for active charters
CREATE INDEX idx_charters_active ON charters(is_active);

-- Composite index for search functionality
CREATE INDEX idx_charters_location_price ON charters(location, price, is_active);

-- Full-text search index
CREATE INDEX idx_charters_search ON charters USING gin(to_tsvector('english', title || ' ' || description));
```

### Reviews Table
```sql
-- Index for charter reviews
CREATE INDEX idx_reviews_charter_id ON reviews(charter_id);

-- Index for user reviews
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- Index for rating filtering
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Index for recent reviews
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Composite index for charter review page
CREATE INDEX idx_reviews_charter_created ON reviews(charter_id, created_at DESC);
```

### Messages Table
```sql
-- Index for sender messages
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- Index for recipient messages
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);

-- Index for conversation lookup
CREATE INDEX idx_messages_conversation ON messages(sender_id, recipient_id, created_at DESC);

-- Index for unread messages
CREATE INDEX idx_messages_read_status ON messages(recipient_id, is_read);
```

### Captain Documents Table
```sql
-- Index for captain documents lookup
CREATE INDEX idx_captain_docs_captain_id ON captain_documents(captain_id);

-- Index for document type filtering
CREATE INDEX idx_captain_docs_type ON captain_documents(document_type);

-- Index for expiration monitoring
CREATE INDEX idx_captain_docs_expiry ON captain_documents(expiry_date);

-- Index for verification status
CREATE INDEX idx_captain_docs_verified ON captain_documents(is_verified);

-- Composite index for compliance dashboard
CREATE INDEX idx_captain_docs_captain_expiry ON captain_documents(captain_id, expiry_date);
```

### Referrals Table
```sql
-- Index for referrer lookup
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);

-- Index for referee lookup
CREATE INDEX idx_referrals_referee_id ON referrals(referee_id);

-- Index for referral code lookup
CREATE INDEX idx_referrals_code ON referrals(referral_code);

-- Index for status filtering
CREATE INDEX idx_referrals_status ON referrals(status);
```

### Custom Emails Table
```sql
-- Index for user email lookup
CREATE INDEX idx_custom_emails_user_id ON custom_emails(user_id);

-- Index for email address lookup
CREATE INDEX idx_custom_emails_email ON custom_emails(email_address);

-- Index for subscription status
CREATE INDEX idx_custom_emails_subscription ON custom_emails(subscription_status);

-- Index for renewal reminders
CREATE INDEX idx_custom_emails_renewal ON custom_emails(subscription_end_date) WHERE subscription_status = 'active';
```

### Email Aliases Table
```sql
-- Index for user aliases lookup
CREATE INDEX idx_email_aliases_user_id ON email_aliases(user_id);

-- Index for alias address lookup
CREATE INDEX idx_email_aliases_address ON email_aliases(alias_address);

-- Index for active aliases
CREATE INDEX idx_email_aliases_active ON email_aliases(is_active);

-- Index for usage tracking
CREATE INDEX idx_email_aliases_last_used ON email_aliases(last_used_at DESC);
```

## Query Optimization Tips

### 1. Use EXPLAIN ANALYZE
```sql
EXPLAIN ANALYZE
SELECT * FROM bookings 
WHERE captain_id = 'xxx' 
AND booking_date >= CURRENT_DATE 
ORDER BY booking_date DESC;
```

### 2. Avoid SELECT *
```sql
-- Bad
SELECT * FROM users WHERE email = 'user@example.com';

-- Good
SELECT id, email, full_name, role FROM users WHERE email = 'user@example.com';
```

### 3. Use Pagination
```sql
-- Limit results and use offset for pagination
SELECT * FROM charters 
WHERE is_active = true 
ORDER BY created_at DESC 
LIMIT 20 OFFSET 0;
```

### 4. Use Composite Indexes
```sql
-- For queries with multiple WHERE conditions
SELECT * FROM bookings 
WHERE captain_id = 'xxx' 
AND status = 'confirmed' 
AND booking_date >= CURRENT_DATE;

-- Create composite index
CREATE INDEX idx_bookings_captain_status_date 
ON bookings(captain_id, status, booking_date);
```

## Connection Pooling

### Supabase Configuration
```typescript
// Already implemented in src/lib/connectionPool.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-application-name': 'gulf-coast-charters',
      },
    },
  }
);
```

### Connection Pool Settings (Supabase Dashboard)
- Max connections: 100
- Min connections: 10
- Connection timeout: 30s
- Idle timeout: 10m

## Caching Strategy

### 1. React Query Cache
```typescript
// Already implemented in src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### 2. Browser Cache
- Static assets: 1 year
- API responses: 5 minutes
- User data: Session storage

### 3. CDN Cache
- Images: 1 year
- CSS/JS: 1 year (with versioning)
- HTML: No cache

## Monitoring Queries

### Slow Query Log
```sql
-- Enable slow query logging in Supabase
ALTER DATABASE postgres SET log_min_duration_statement = 1000; -- Log queries > 1s
```

### Query Statistics
```sql
-- View most expensive queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;
```

## Maintenance Tasks

### 1. Vacuum Tables
```sql
-- Run weekly
VACUUM ANALYZE bookings;
VACUUM ANALYZE charters;
VACUUM ANALYZE reviews;
```

### 2. Update Statistics
```sql
-- Run after bulk operations
ANALYZE bookings;
ANALYZE charters;
```

### 3. Rebuild Indexes
```sql
-- Run monthly
REINDEX TABLE bookings;
REINDEX TABLE charters;
```

## Load Testing

### Expected Performance
- 1000 concurrent users
- 10,000 requests per minute
- < 200ms average response time
- < 50ms database query time (p95)

### Tools
- Apache JMeter for load testing
- pgBench for database benchmarking
- Lighthouse for frontend performance

## Scaling Recommendations

### Horizontal Scaling
- Use Supabase read replicas for read-heavy operations
- Implement Redis for session storage
- Use CDN for static assets

### Vertical Scaling
- Upgrade database instance for more connections
- Increase connection pool size
- Add more RAM for caching

### Application Scaling
- Deploy multiple instances behind load balancer
- Use serverless functions for background jobs
- Implement message queue for async operations

## Backup Strategy

### Automated Backups
- Daily full backups (retained 30 days)
- Hourly incremental backups (retained 7 days)
- Point-in-time recovery enabled

### Backup Testing
- Monthly restore tests
- Disaster recovery drills
- Data integrity checks

## Security Considerations

### Row Level Security (RLS)
```sql
-- Already implemented on all tables
-- Example for bookings table
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = captain_id);
```

### API Rate Limiting
- 100 requests per minute per user
- 1000 requests per minute per IP
- Exponential backoff for repeated violations

## Conclusion

All optimizations are production-ready and tested for enterprise scale. The platform can handle 1000s of concurrent users with proper database indexing, connection pooling, caching, and monitoring in place.
