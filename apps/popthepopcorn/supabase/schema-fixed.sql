-- Fixed version of schema.sql
-- This version removes the problematic index predicate that uses NOW()

-- The issue was on line 227:
-- OLD: CREATE INDEX idx_trending_topics_expires_at ON trending_topics(expires_at) WHERE expires_at > NOW();
-- NEW: CREATE INDEX idx_trending_topics_expires_at ON trending_topics(expires_at);

-- Why? NOW() is not IMMUTABLE (returns different values over time), so it can't be used in index predicates.
-- The index will still work fine - just filter in your queries: WHERE expires_at > NOW()

-- To apply this fix:
-- 1. If you already ran schema.sql and got the error, just run this single line:
--    CREATE INDEX idx_trending_topics_expires_at ON trending_topics(expires_at);
--
-- 2. Or replace line 227 in schema.sql with the fixed version above, then run the whole schema.sql again

CREATE INDEX IF NOT EXISTS idx_trending_topics_expires_at ON trending_topics(expires_at);
