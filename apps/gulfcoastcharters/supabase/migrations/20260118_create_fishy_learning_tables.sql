-- Fishy AI Learning System Tables
-- Stores conversations and learning patterns for the Fishy chatbot

-- Conversation logs table
CREATE TABLE IF NOT EXISTS fishy_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL CHECK (user_type IN ('captain', 'customer')),
  user_message TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  intent TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  context JSONB DEFAULT '{}'::jsonb,
  conversation_length INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning patterns table
CREATE TABLE IF NOT EXISTS fishy_learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('captain', 'customer')),
  pattern_text TEXT NOT NULL,
  response_template TEXT,
  times_seen INTEGER DEFAULT 1,
  response_quality INTEGER DEFAULT 50 CHECK (response_quality >= 0 AND response_quality <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(intent, user_type, pattern_text)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fishy_conversations_user_type ON fishy_conversations(user_type);
CREATE INDEX IF NOT EXISTS idx_fishy_conversations_intent ON fishy_conversations(intent);
CREATE INDEX IF NOT EXISTS idx_fishy_conversations_created_at ON fishy_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fishy_conversations_sentiment ON fishy_conversations(sentiment);

CREATE INDEX IF NOT EXISTS idx_fishy_learning_patterns_intent ON fishy_learning_patterns(intent);
CREATE INDEX IF NOT EXISTS idx_fishy_learning_patterns_user_type ON fishy_learning_patterns(user_type);
CREATE INDEX IF NOT EXISTS idx_fishy_learning_patterns_times_seen ON fishy_learning_patterns(times_seen DESC);
CREATE INDEX IF NOT EXISTS idx_fishy_learning_patterns_response_quality ON fishy_learning_patterns(response_quality DESC);

-- Disable RLS for development (enable in production with proper policies)
ALTER TABLE fishy_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE fishy_learning_patterns DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE fishy_conversations IS 'Stores all Fishy chatbot conversations for learning and analytics';
COMMENT ON TABLE fishy_learning_patterns IS 'Stores learned patterns from Fishy conversations to improve responses';
