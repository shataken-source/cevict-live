# Database Optimization & Connection Management Guide

## 🔌 Connection Pool Configuration

### Current Setup
```typescript
// src/lib/connectionPool.ts
- Max Connections: 100
- Min Connections: 10
- Idle Timeout: 30 seconds
- Connection Timeout: 10 seconds
- Retry Attempts: 3
- Retry Delay: Exponential backoff (1s, 2s, 4s)
```

### Monitoring Connection Health
```bash
# Access Performance Monitor
Navigate to: /admin → Performance Monitor
Click: "Check Database Health"

# Expected Results:
- Status: Healthy
- Response Time: <100ms
- Active Connections: <50 (normal load)
- Errors: 0
```

## 🚀 Stress Testing Procedures

### Running Stress Tests
1. Navigate to Admin Panel → Performance Monitor
2. Click "Run Stress Test"
3. Test simulates 1000 concurrent users, 5 requests each
4. Total: 5000 requests in parallel

### Interpreting Results
```
✅ HEALTHY SYSTEM:
- Success Rate: >99%
- Avg Response Time: <200ms
- Requests Per Second: >100
- Failed Requests: <1%

⚠️ DEGRADED SYSTEM:
- Success Rate: 95-99%
- Avg Response Time: 200-500ms
- Requests Per Second: 50-100
- Failed Requests: 1-5%

❌ CRITICAL SYSTEM:
- Success Rate: <95%
- Avg Response Time: >500ms
- Requests Per Second: <50
- Failed Requests: >5%
```

## 📊 Database Tables & Indexes

### Core Tables
```sql
-- Captains (indexed on: id, user_id, status, verification_status)
-- Charters (indexed on: id, captain_id, status, created_at)
-- Bookings (indexed on: id, charter_id, customer_id, status, booking_date)
-- Reviews (indexed on: id, charter_id, customer_id, created_at)
-- Users (indexed on: id, email, role)
```

### Recommended Indexes for Performance
```sql
-- Add composite indexes for common queries
CREATE INDEX idx_bookings_captain_status ON bookings(captain_id, status);
CREATE INDEX idx_charters_location_date ON charters(location, created_at);
CREATE INDEX idx_reviews_rating_date ON reviews(rating, created_at);
```

## 🔒 Row Level Security (RLS) Policies

### Verification Checklist
```bash
# All tables should have RLS enabled
✓ captains - Users see only their own data
✓ charters - Public read, owner write
✓ bookings - Customer and captain can view
✓ reviews - Public read, author write
✓ messages - Only participants can view
```

### Testing RLS
```typescript
// Test as different user roles
const testRLS = async () => {
  // As customer - should only see own bookings
  const { data: customerBookings } = await supabase
    .from('bookings')
    .select('*');
  
  // As captain - should only see own charters
  const { data: captainCharters } = await supabase
    .from('charters')
    .select('*');
};
```

## ⚡ Query Optimization

### Slow Query Detection
```sql
-- Find slow queries (>1 second)
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY total_time DESC
LIMIT 10;
```

### Common Optimizations
1. **Use Pagination**: Always limit results
   ```typescript
   .select('*').range(0, 49) // 50 items per page
   ```

2. **Select Specific Columns**: Don't use SELECT *
   ```typescript
   .select('id, name, price, location')
   ```

3. **Use Indexes**: Query indexed columns
   ```typescript
   .eq('status', 'active') // status is indexed
   ```

4. **Batch Operations**: Use upsert for multiple inserts
   ```typescript
   .upsert([item1, item2, item3])
   ```

## 🔄 Connection Pool Tuning

### For High Traffic (>10,000 daily users)
```typescript
// Increase pool size
maxConnections: 200
minConnections: 20
idleTimeout: 60000 // 60 seconds
```

### For Low Traffic (<1,000 daily users)
```typescript
// Reduce pool size to save resources
maxConnections: 50
minConnections: 5
idleTimeout: 15000 // 15 seconds
```

## 📈 Scaling Strategies

### Vertical Scaling (Increase Database Resources)
1. Upgrade Supabase plan
2. Increase RAM allocation
3. Add more CPU cores
4. Use faster storage (SSD)

### Horizontal Scaling (Read Replicas)
1. Enable read replicas in Supabase
2. Route read queries to replicas
3. Keep writes on primary database
4. Use connection pooling for each replica

### Caching Layer
```typescript
// Implement Redis cache for frequent queries
const getCachedCharters = async () => {
  const cacheKey = 'featured_charters';
  const cached = await redis.get(cacheKey);
  
  if (cached) return JSON.parse(cached);
  
  const { data } = await supabase
    .from('charters')
    .select('*')
    .eq('featured', true);
  
  await redis.set(cacheKey, JSON.stringify(data), 'EX', 300); // 5 min cache
  return data;
};
```

## 🛡️ Backup & Recovery

### Automated Backups
- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 30 days
- **Storage**: Encrypted S3 bucket
- **Verification**: Weekly restore tests

### Manual Backup
```bash
# Create on-demand backup
Navigate to: Admin Panel → Database Backup
Click: "Create Backup Now"
Download: Available immediately
```

### Restore Procedure
```bash
1. Navigate to Admin Panel → Database Backup
2. Select backup date
3. Click "Restore from Backup"
4. Confirm restoration (WARNING: Overwrites current data)
5. Wait for completion (5-15 minutes)
6. Verify data integrity
```

## 🔍 Monitoring & Alerts

### Key Metrics to Monitor
- **Connection Pool Usage**: Should stay <80%
- **Query Response Time**: Average <100ms
- **Error Rate**: Should be <0.1%
- **Database Size**: Monitor growth trends
- **Active Sessions**: Track concurrent users

### Alert Thresholds
```yaml
Critical Alerts:
  - Connection pool >90% full
  - Average response time >500ms
  - Error rate >1%
  - Database size >80% of quota

Warning Alerts:
  - Connection pool >70% full
  - Average response time >200ms
  - Error rate >0.5%
  - Database size >60% of quota
```

## 🧪 Testing Checklist

### Before Production Deployment
- [ ] Run stress test with 1000+ concurrent users
- [ ] Verify all RLS policies are enabled
- [ ] Check all indexes are created
- [ ] Test backup and restore procedures
- [ ] Verify connection pool settings
- [ ] Monitor query performance
- [ ] Test failover scenarios
- [ ] Verify SSL/TLS encryption
- [ ] Check audit logging is enabled
- [ ] Test rate limiting

### Weekly Maintenance
- [ ] Review slow query log
- [ ] Check connection pool metrics
- [ ] Verify backup completion
- [ ] Review error logs
- [ ] Update statistics
- [ ] Vacuum database (if needed)
- [ ] Check disk space
- [ ] Review security alerts

## 📞 Troubleshooting

### "Too Many Connections" Error
```typescript
// Solution 1: Increase pool size
maxConnections: 150

// Solution 2: Reduce connection timeout
connectionTimeout: 5000

// Solution 3: Close idle connections faster
idleTimeout: 15000
```

### Slow Query Performance
```typescript
// Solution 1: Add indexes
CREATE INDEX idx_name ON table(column);

// Solution 2: Use pagination
.range(0, 49)

// Solution 3: Cache results
// Implement Redis caching
```

### Connection Timeouts
```typescript
// Solution 1: Increase timeout
connectionTimeout: 30000

// Solution 2: Add retry logic
retryAttempts: 5

// Solution 3: Check network latency
// Use CDN or edge functions
```

## 🎯 Performance Targets

### Production SLAs
- **Uptime**: 99.9% (8.76 hours downtime/year)
- **Response Time**: <200ms (95th percentile)
- **Throughput**: >1000 requests/second
- **Error Rate**: <0.1%
- **Connection Success**: >99.9%

### Monitoring Tools
- Built-in Performance Monitor
- Supabase Dashboard
- Application logs
- Error tracking (Sentry)
- Uptime monitoring (external)

---

**Last Updated**: November 2025
**Maintained By**: Database Operations Team
