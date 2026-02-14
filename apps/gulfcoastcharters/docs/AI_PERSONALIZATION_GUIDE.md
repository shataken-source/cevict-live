# AI Personalization System Guide

## Overview
Your platform now has Amazon and Google-style AI personalization powered by Gemini 2.5 Flash.

## Features Implemented

### 1. **Personalized Homepage** (Amazon-style)
- **Top Picks for You**: AI-generated recommendations based on browsing/booking history
- **Deals for You**: Personalized discount offers
- **Recently Viewed**: Quick access to viewed charters
- **Popular Near You**: Location-based suggestions

**Usage**: Automatically shown to logged-in users on homepage

### 2. **Smart Search Bar** (Google-style)
- AI-powered autocomplete suggestions
- Personalized search results based on user context
- Search history tracking
- Natural language understanding

**Location**: Homepage and navigation bar

### 3. **User Interests Manager** (Amazon Interests Feature)
- Users can add specific interests (e.g., "Deep sea fishing in Miami")
- AI analyzes behavior to suggest interests
- Continuous scanning for matching charters
- Automatic notifications for new matches, deals, restocks

**Access**: User dashboard and profile settings

### 4. **Conversational AI Assistant** (Rufus-style)
- Natural language charter search
- Compare charters, get details, find deals
- Set price alerts
- Add items to cart via conversation
- Examples: "Find deep sea fishing in Miami" or "Show me the charter I viewed yesterday"

**Access**: Floating button in bottom-right corner (always available)

### 5. **Frequently Booked Together** (Amazon-style)
- Shows charters commonly booked together
- Checkbox selection for multiple bookings
- Bundle pricing display
- One-click add all to cart

**Location**: Charter detail pages

## Edge Functions

### ai-personalization-engine
**Endpoint**: `/functions/v1/ai-personalization-engine`

**Actions**:
- `generate_recommendations`: Creates personalized charter suggestions
- `personalize_description`: Rewrites descriptions based on user interests
- `analyze_interests`: Suggests interests from user behavior
- `smart_search`: Enhances search queries with AI

**Example**:
```javascript
const { data } = await supabase.functions.invoke('ai-personalization-engine', {
  body: { 
    action: 'generate_recommendations',
    userId: user.id,
    data: { userHistory: [...] }
  }
});
```

### interest-notification-scanner
**Endpoint**: `/functions/v1/interest-notification-scanner`

**Purpose**: Cron job that scans for new charters matching user interests

**Setup**: Run daily via GitHub Actions or cron service

## Database Tables

### user_interests
Stores user-defined interests for personalized notifications
- `user_id`: User reference
- `interests`: Array of interest strings
- `updated_at`: Last modification

### user_searches
Tracks search queries for autocomplete and personalization
- `user_id`: User reference
- `query`: Search string
- `created_at`: Timestamp

### user_activity
Tracks all user interactions for AI learning
- `user_id`: User reference
- `charter_id`: Charter reference
- `activity_type`: 'view', 'search', 'book', 'favorite'
- `metadata`: Additional context
- `created_at`: Timestamp

### interest_notifications
Queues notifications for interest matches
- `user_id`: User reference
- `interest`: Matched interest
- `charter_id`: Matching charter
- `notification_type`: 'new_match', 'price_drop', 'restock'
- `sent`: Boolean flag

## AI Model Used
**Default**: `google/gemini-2.5-flash`
- Best balance of speed and intelligence
- Cost-effective for high-volume personalization
- Excellent at understanding user preferences

## Setup Instructions

1. **Enable Features**: Already active on homepage for logged-in users
2. **Cron Job**: Set up daily run of `interest-notification-scanner`
3. **User Onboarding**: Encourage users to set interests in their profile
4. **Analytics**: Monitor engagement via user_activity table

## Revenue Impact
- **35% increase in bookings** (Amazon sees 35% from recommendations)
- **Reduced bounce rate** via personalized content
- **Higher user retention** through interest notifications
- **Increased average order value** via "Frequently Booked Together"

## Next Steps
1. Train users to use the AI assistant
2. Promote interest feature in onboarding
3. A/B test personalized vs standard homepage
4. Add email notifications for interest matches
5. Expand to personalized pricing and offers

---

## Implementation status (no-BS)

**Implemented (so the existing UI doesn’t break):**

- **Tables** (migration `20260210_ai_personalization_tables.sql`):  
  - **user_interests** – user_id (PK), interests (JSONB), updated_at. One row per user. RLS: own row only.  
  - **user_searches** – id, user_id, query, created_at. RLS: own rows only.  
  - **user_activity** – id, user_id, charter_id, activity_type, metadata (JSONB), created_at. RLS: own rows only.  
  - **interest_notifications** – **not** created; no scanner or UI uses it yet.

- **Edge function** `ai-personalization-engine`:  
  - **generate_recommendations** – body: userId, data.userHistory (array with charter_id). Returns `{ data: [ { charterId } ] }` from recent activity, or fallback to first 8 charters. No Gemini call yet.  
  - **analyze_interests** – body: userId, data.behavior. Returns `{ data: string[] }` with static suggestions (e.g. "Deep sea fishing", "Half day charter"). No AI yet.  
  - **smart_search** – body: data.query. Returns `{ data: { enhancedQuery } }` (pass-through). No AI enhancement yet.

- **UI that uses the above:**  
  - **PersonalizedHomepage** – reads user_activity, calls generate_recommendations, shows Top Picks / Deals / Recently Viewed / Near You.  
  - **UserInterestsManager** – reads/upserts user_interests, calls analyze_interests for suggestions. Uses `.maybeSingle()` so missing row doesn’t error.  
  - **SmartSearchBar** – reads user_searches, inserts on search, calls smart_search and navigates to enhancedQuery.  
  - **FrequentlyBookedTogether** – uses only `bookings` + `charters`; no new tables or function.  
  - **ConversationalAIAssistant** – uses Gemini 2.5 Flash (e.g. OpenRouter) in the client; not this edge function.

**Not implemented (vapor per no-BS rule):**

- **interest-notification-scanner** – no cron or UI depends on it; **skip** until you add a cron and need it.  
- **interest_notifications** table – only needed for that scanner; **skip** until scanner exists.  
- **personalize_description** – no caller in codebase; **skip**.  
- **Gemini inside ai-personalization-engine** – not wired; you can add later (e.g. GEMINI_API_KEY + fetch to Gemini API) for real recommendations/suggestions/enhanced search.

**To add real AI later:** In `ai-personalization-engine`, call Gemini (or another model) in each action and replace the rule-based/mock responses with the model output. Ensure `user_activity` is written when users view charters so generate_recommendations has data to work with.
