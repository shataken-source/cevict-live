# AI Chatbot Training & Analytics System Guide

## Overview
Gulf Coast Charters now features an advanced AI chatbot with machine learning capabilities, conversation tracking, sentiment analysis, and comprehensive admin tools.

## Features Implemented

### 1. **Enhanced AI Chatbot** (`SmartChatbot.tsx`)
- **Conversation Tracking**: Each session is tracked with unique session IDs
- **Sentiment Analysis**: AI analyzes user sentiment (positive/neutral/negative)
- **Automatic Escalation**: Complex issues are flagged for human support
- **User Feedback**: Thumbs up/down on each bot response
- **Knowledge Base Integration**: Checks custom Q&A before using AI

### 2. **Admin Interface** (`ChatbotAdmin.tsx`)
Three main tabs:
- **Analytics**: Overview of total conversations, helpful rate, resolution rate, escalations
- **Conversations**: Review all chatbot interactions with sentiment badges
- **Knowledge Base**: Add custom Q&A pairs with keywords for instant answers

### 3. **Analytics Dashboard** (`ChatbotAnalyticsDashboard.tsx`)
- Total conversation count
- Helpful response rate percentage
- Escalation rate tracking
- Average response time
- Top 10 most common questions

### 4. **Enhanced Edge Function** (`ai-support-bot`)
- Knowledge base lookup before AI query (saves API costs)
- Sentiment analysis using Google Gemini
- Automatic escalation detection for keywords: urgent, emergency, complaint, refund, etc.
- Conversation logging to database
- Confidence scoring

## Database Schema

### Tables Required
```sql
-- Chatbot conversations
CREATE TABLE chatbot_conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence_score DECIMAL(3,2),
  was_helpful BOOLEAN,
  escalated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge base
CREATE TABLE chatbot_knowledge_base (
  id UUID PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT[],
  usage_count INTEGER DEFAULT 0,
  effectiveness_score DECIMAL(3,2) DEFAULT 0.5,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback tracking
CREATE TABLE chatbot_feedback (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES chatbot_conversations(id),
  admin_notes TEXT,
  marked_helpful BOOLEAN,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ DEFAULT now()
);

-- Daily analytics
CREATE TABLE chatbot_analytics (
  id UUID PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_conversations INTEGER DEFAULT 0,
  helpful_responses INTEGER DEFAULT 0,
  unhelpful_responses INTEGER DEFAULT 0,
  escalations INTEGER DEFAULT 0,
  avg_sentiment_score DECIMAL(3,2),
  common_questions JSONB,
  resolution_rate DECIMAL(5,2)
);
```

## How to Use

### For End Users
1. Click the blue chat bubble in bottom-right corner
2. Ask any question about bookings, certifications, features
3. Rate responses with thumbs up/down
4. If escalated, you'll get a prompt to contact support

### For Admins
1. Navigate to Admin Panel → Chatbot Management
2. **View Analytics**: See performance metrics and trends
3. **Review Conversations**: Read all interactions, mark helpful/unhelpful
4. **Manage Knowledge Base**: Add custom Q&A pairs for instant responses

### Adding Knowledge Base Entries
1. Go to "Knowledge Base" tab in admin
2. Enter question (e.g., "How do I book a charter?")
3. Enter answer (detailed response)
4. Add keywords (comma-separated: "book, booking, reserve, charter")
5. Click "Add Entry"

The bot will now check this entry first before using AI!

## Automatic Escalation

The bot automatically escalates to human support when it detects:
- Keywords: urgent, emergency, complaint, refund, cancel booking, speak to manager, human
- Negative sentiment with low confidence
- Repeated unhelpful responses in same session

## Training the Model

### Current Approach
- Knowledge base entries are prioritized over AI responses
- User feedback (thumbs up/down) is tracked
- Admin can review and mark conversations as helpful/unhelpful
- Common questions are identified for knowledge base additions

### Future Enhancements
- Implement fine-tuning based on feedback data
- Auto-suggest knowledge base entries from common questions
- A/B testing different response styles
- Integration with support ticket system

## API Integration

The chatbot uses:
- **Google Gemini 2.5 Flash** for AI responses (via API Gateway)
- **Sentiment Analysis** using Gemini
- **Knowledge Base** stored in Supabase
- **Conversation Logging** to Supabase tables

## Performance Metrics

Track these KPIs:
- **Resolution Rate**: % of conversations marked helpful
- **Escalation Rate**: % requiring human intervention
- **Response Time**: Average time to generate response
- **Knowledge Base Hit Rate**: % answered from KB vs AI
- **User Satisfaction**: Thumbs up vs thumbs down ratio

## Best Practices

1. **Regularly Review Conversations**: Check for patterns in unhelpful responses
2. **Update Knowledge Base**: Add entries for frequently asked questions
3. **Monitor Escalations**: Identify topics that need better documentation
4. **Analyze Sentiment**: Track user frustration and improve responses
5. **Test Responses**: Periodically test the bot with common questions

## Troubleshooting

### Bot Not Responding
- Check GATEWAY_API_KEY is configured
- Verify Supabase connection
- Check browser console for errors

### Knowledge Base Not Working
- Ensure keywords are relevant and lowercase
- Check table exists and has data
- Verify RLS policies allow reads

### Analytics Not Loading
- Confirm tables exist in database
- Check user has admin role
- Verify RLS policies for admin access

## Next Steps

1. **Create Database Tables**: Run the SQL schema above in Supabase SQL editor
2. **Add Initial Knowledge Base**: Populate with 20-30 common Q&A pairs
3. **Test Thoroughly**: Try various questions and edge cases
4. **Monitor Performance**: Check analytics daily for first week
5. **Iterate**: Add more knowledge base entries based on common questions

## Support

For issues with the chatbot system:
- Check logs in Supabase Edge Functions dashboard
- Review conversation history in admin panel
- Contact development team with specific error messages

---

**Note**: The database tables may need to be created manually in Supabase SQL editor if automatic migration fails due to row size limits. Copy the SQL schema above and execute it directly.
