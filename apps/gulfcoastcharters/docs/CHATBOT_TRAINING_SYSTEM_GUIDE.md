# AI Chatbot Training & Analytics (No-BS)

Support chatbot with knowledge base, conversation logging, sentiment/escalation, and admin review. This doc reflects what’s in the repo and what you need to run it.

---

## What’s in the repo

| Piece | Location | Notes |
|-------|----------|--------|
| **SmartChatbot** | `src/components/SmartChatbot.tsx` | Floating chat bubble; calls `ai-support-bot` with question, sessionId, userId, checkKnowledgeBase. Shows answer, sentiment, escalation prompt. Thumbs up/down persist to `chatbot_conversations.was_helpful` and `chatbot_feedback`. |
| **ChatbotAdmin** | `src/components/admin/ChatbotAdmin.tsx` | Route: `/admin/chatbot`. Tabs: Analytics (totals, helpful, resolution %, escalations), Conversations (list + mark helpful/unhelpful), Knowledge Base (add Q&A + keywords). |
| **ChatbotAnalyticsDashboard** | `src/components/admin/ChatbotAnalyticsDashboard.tsx` | Reads `chatbot_conversations`, computes helpful/escalation rate and top questions client-side. Avg response time is hardcoded (1.2s). |
| **ai-support-bot** | `supabase/functions/ai-support-bot/index.ts` | KB lookup (keyword match) → else Gateway chat (GATEWAY_API_KEY). Logs to `chatbot_conversations`, returns answer, sentiment, needsEscalation, conversationId. |
| **fishy-ai-assistant** | `supabase/functions/fishy-ai-assistant/index.ts` | Different flow: Fishy concierge, learning patterns, different request/response shape. Used by FishyAIChat / TroubleshootingChatbot, not by SmartChatbot. |
| **DB migration** | `supabase/migrations/20260210_chatbot_tables.sql` | Creates `chatbot_conversations`, `chatbot_knowledge_base`, `chatbot_feedback`, `chatbot_analytics` and RLS. |

---

## Database

Run the migration so the tables exist:

- Apply `supabase/migrations/20260210_chatbot_tables.sql`.

Tables:

- **chatbot_conversations** – user_id, session_id, message, response, sentiment, confidence_score, was_helpful, escalated, created_at.
- **chatbot_knowledge_base** – question, answer, category, keywords (TEXT[]), usage_count, effectiveness_score, created_by.
- **chatbot_feedback** – conversation_id, admin_notes, marked_helpful, reviewed_by, reviewed_at.
- **chatbot_analytics** – date, total_conversations, helpful_responses, unhelpful_responses, escalations, avg_sentiment_score, common_questions (JSONB), resolution_rate. Optional; admin can also aggregate from conversations.

---

## Edge function: ai-support-bot

- **Deploy:** `supabase functions deploy ai-support-bot`
- **Env:** `GATEWAY_API_KEY` (for AI when no KB match). Uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **Contract:** Body `{ question, sessionId?, userId?, checkKnowledgeBase? }`. Response `{ answer, sentiment, needsEscalation, conversationId }`.
- **KB:** Matches by keyword overlap and question substring; first match wins. Increments `usage_count` on hit.
- **Escalation:** Keyword check (e.g. urgent, emergency, complaint, refund, cancel booking, human, etc.). Sets `escalated` and `needsEscalation`.
- **Sentiment:** Simple keyword-based (positive/neutral/negative). Not Gemini-based in this implementation.

---

## How it’s used

- **User:** Open chat bubble → ask question → get answer; optional thumbs up/down (persisted if `conversationId` is present). Escalation shows toast to contact support.
- **Admin:** `/admin/chatbot` → Analytics (from conversations + optional chatbot_analytics), Conversations (review, mark helpful/unhelpful), Knowledge Base (add Q&A and keywords). KB entries are checked before calling AI.

---

## Training / “model” (no-BS)

- **Current:** KB first (saves API cost); thumbs up/down and admin “helpful” stored; common questions derived in analytics. No fine-tuning or auto-suggest in code.
- **Future (doc only):** Fine-tuning from feedback, A/B tests, support-ticket integration – not implemented.

---

## API / performance

- **AI:** Gateway chat (e.g. Claude) when KB doesn’t match; requires `GATEWAY_API_KEY`.
- **Metrics:** Resolution rate and escalation rate come from `chatbot_conversations` (was_helpful, escalated). Response time in the dashboard is a placeholder unless you add timing in the function and store it.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| Bot not responding | `GATEWAY_API_KEY` set for edge function; Supabase logs for ai-support-bot. |
| KB not used | Table exists; keywords populated and relevant; question wording may not match keyword logic (keyword overlap / substring). |
| Analytics empty | Tables created; RLS allows read; admin has access to `/admin/chatbot`. |
| Ratings not saving | ai-support-bot returns `conversationId`; SmartChatbot sends it; `chatbot_conversations` and `chatbot_feedback` exist and RLS allows insert/update. |

---

**Last updated:** February 2026 (no-BS pass).  
**Cross-check:** `COMPREHENSIVE_PLATFORM_GUIDE.md` (no-BS), `FEATURE_IMPLEMENTATION_STATUS.md`.
