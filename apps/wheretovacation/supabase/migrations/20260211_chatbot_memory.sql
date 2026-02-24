-- Chatbot memory & analytics (shared for Finn/Fishy, GCC/WTV)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. Chatbot conversations
-- ============================================

CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.shared_users(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'wtv', -- 'wtv' | 'gcc' | 'other'
  bot TEXT NOT NULL,                    -- 'finn' | 'fishy' | 'support' | ...
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence_score DECIMAL(3,2),
  was_helpful BOOLEAN,
  escalated BOOLEAN DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user
  ON public.chatbot_conversations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session
  ON public.chatbot_conversations(session_id, created_at ASC);

-- ============================================
-- 2. Knowledge base
-- ============================================

CREATE TABLE IF NOT EXISTS public.chatbot_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL DEFAULT 'wtv', -- 'wtv' | 'gcc' | 'shared'
  bot TEXT,                             -- optional: target bot
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT[],
  usage_count INTEGER DEFAULT 0,
  effectiveness_score DECIMAL(3,2) DEFAULT 0.5,
  created_by UUID REFERENCES public.shared_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_kb_keywords
  ON public.chatbot_knowledge_base USING GIN (keywords);

-- ============================================
-- 3. Feedback tracking
-- ============================================

CREATE TABLE IF NOT EXISTS public.chatbot_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  admin_notes TEXT,
  marked_helpful BOOLEAN,
  reviewed_by UUID REFERENCES public.shared_users(id),
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_feedback_conversation
  ON public.chatbot_feedback(conversation_id);

-- ============================================
-- 4. Daily analytics (aggregated from conversations)
-- ============================================

CREATE TABLE IF NOT EXISTS public.chatbot_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'wtv',
  total_conversations INTEGER DEFAULT 0,
  helpful_responses INTEGER DEFAULT 0,
  unhelpful_responses INTEGER DEFAULT 0,
  escalations INTEGER DEFAULT 0,
  avg_sentiment_score DECIMAL(3,2),
  common_questions JSONB,
  resolution_rate DECIMAL(5,2)
);

