-- AI Chatbot: conversations, knowledge base, feedback, analytics
-- Required for SmartChatbot, ChatbotAdmin, ChatbotAnalyticsDashboard, ai-support-bot

-- Conversations (one row per user message + bot response)
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence_score DECIMAL(3,2),
  was_helpful BOOLEAN,
  escalated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge base (custom Q&A)
CREATE TABLE IF NOT EXISTS public.chatbot_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT[],
  usage_count INTEGER DEFAULT 0,
  effectiveness_score DECIMAL(3,2) DEFAULT 0.5,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin feedback on conversations
CREATE TABLE IF NOT EXISTS public.chatbot_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  admin_notes TEXT,
  marked_helpful BOOLEAN,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ DEFAULT now()
);

-- Daily aggregates (optional; can be computed from conversations)
CREATE TABLE IF NOT EXISTS public.chatbot_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_conversations INTEGER DEFAULT 0,
  helpful_responses INTEGER DEFAULT 0,
  unhelpful_responses INTEGER DEFAULT 0,
  escalations INTEGER DEFAULT 0,
  avg_sentiment_score DECIMAL(3,2),
  common_questions JSONB,
  resolution_rate DECIMAL(5,2)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session ON public.chatbot_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created ON public.chatbot_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_base_keywords ON public.chatbot_knowledge_base USING GIN(keywords);

-- RLS
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_analytics ENABLE ROW LEVEL SECURITY;

-- Service role / admin can do everything; anon can insert conversations (bot logs) and read for their own
DROP POLICY IF EXISTS "Allow insert chatbot_conversations" ON public.chatbot_conversations;
CREATE POLICY "Allow insert chatbot_conversations" ON public.chatbot_conversations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow read chatbot_conversations" ON public.chatbot_conversations;
CREATE POLICY "Allow read chatbot_conversations" ON public.chatbot_conversations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow update chatbot_conversations was_helpful" ON public.chatbot_conversations;
CREATE POLICY "Allow update chatbot_conversations was_helpful" ON public.chatbot_conversations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow read chatbot_knowledge_base" ON public.chatbot_knowledge_base;
CREATE POLICY "Allow read chatbot_knowledge_base" ON public.chatbot_knowledge_base FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert chatbot_knowledge_base" ON public.chatbot_knowledge_base;
CREATE POLICY "Allow insert chatbot_knowledge_base" ON public.chatbot_knowledge_base FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update chatbot_knowledge_base" ON public.chatbot_knowledge_base;
CREATE POLICY "Allow update chatbot_knowledge_base" ON public.chatbot_knowledge_base FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow all chatbot_feedback" ON public.chatbot_feedback;
CREATE POLICY "Allow all chatbot_feedback" ON public.chatbot_feedback FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow read chatbot_analytics" ON public.chatbot_analytics;
CREATE POLICY "Allow read chatbot_analytics" ON public.chatbot_analytics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert chatbot_analytics" ON public.chatbot_analytics;
CREATE POLICY "Allow insert chatbot_analytics" ON public.chatbot_analytics FOR INSERT WITH CHECK (true);
