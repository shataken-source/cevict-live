# PROGNO Database Setup

## Quick Start

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and service role key

2. **Run Schema Migration**
   - Open Supabase Dashboard → SQL Editor
   - Copy and paste contents of `schema.sql`
   - Execute the script

3. **Set Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Install Dependencies**
   ```bash
   cd apps/progno
   npm install
   ```

## Database Tables

### `progno_predictions`
Stores all predictions (sports, weather, travel, anything, etc.)

**Key Fields:**
- `prediction_type`: Type of prediction (sports, weather, travel, anything, etc.)
- `category`: Specific category (NFL, NBA, hurricane, etc.)
- `question`: The prediction question
- `prediction_data`: JSONB with prediction details
- `confidence`: 0-100% confidence
- `status`: pending, correct, incorrect, partial, cancelled
- `is_correct`: Boolean (true/false/null)
- `accuracy_score`: 0-100% accuracy

### `progno_outcomes`
Tracks when outcomes are recorded for predictions

### `progno_accuracy_metrics`
Pre-calculated metrics for fast queries

## API Endpoints

- `GET /api/progno/predictions` - List predictions (with filters)
- `POST /api/progno/predictions` - Create new prediction
- `GET /api/progno/predictions/[id]` - Get specific prediction
- `PATCH /api/progno/predictions/[id]` - Update prediction (record outcome)
- `GET /api/progno/predictions/stats` - Get win percentages and stats

## Usage Example

```typescript
// Create a prediction
const response = await fetch('/api/progno/predictions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prediction_type: 'sports',
    category: 'NFL',
    question: 'Will Chiefs beat Bills?',
    prediction_data: {
      gameId: 'game123',
      homeTeam: 'Chiefs',
      awayTeam: 'Bills',
      predictedWinner: 'Chiefs',
      pick: 'Chiefs -3.5',
    },
    confidence: 75,
    source: 'weekly-analyzer',
  }),
});

// Record outcome
await fetch(`/api/progno/predictions/${predictionId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'correct',
    is_correct: true,
    outcome_data: {
      actualWinner: 'Chiefs',
      finalScore: { home: 28, away: 24 },
    },
    accuracy_score: 95,
  }),
});

// Get stats
const stats = await fetch('/api/progno/predictions/stats?type=sports');
```

## Next Steps

1. Update `prediction-tracker.ts` to use database instead of files
2. Add automated outcome tracking for sports games
3. Create dashboard to view win percentages
4. Set up scheduled jobs to calculate metrics

