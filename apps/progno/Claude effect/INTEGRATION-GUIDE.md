# 🔗 THE CLAUDE EFFECT - INTEGRATION GUIDE

## Quick Start: Using All 7 Phases

### Basic Integration

```typescript
import { ClaudeEffectEngine } from './app/lib/claude-effect';

const engine = new ClaudeEffectEngine();

// Calculate full Claude Effect
const result = await engine.calculateClaudeEffect(
  0.65,  // Base probability (65%)
  0.75,  // Base confidence (75%)
  gameData,
  {
    sentiment: await getSentimentData(teamId),
    narratives: await getNarrativeData(teamId, opponentId),
    informationAsymmetry: await getIAIData(gameId),
    chaosFactors: await getCSIData(gameData),
    network: await getNIGData(teamId),
    temporal: getTemporalEvents(teamId),
    emergent: { teamId, opponentId, gameData },
  }
);

// Use result
console.log(`Adjusted Probability: ${(result.adjustedProbability * 100).toFixed(1)}%`);
console.log(`Adjusted Confidence: ${(result.adjustedConfidence * 100).toFixed(1)}%`);
console.log(`Recommendation: ${result.recommendations.betSize}`);
```

---

## Phase-by-Phase Integration

### Phase 1: Sentiment Field (SF)

```typescript
// API Call
const response = await fetch('/api/sentiment/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teamId: 'alabama',
    gameId: 'game_123',
    sources: {
      social: true,
      press: true,
      news: true,
    },
  }),
});

const { data } = await response.json();
// data.sentimentField: -0.2 to +0.2
```

### Phase 2: Narrative Momentum (NM)

```typescript
// API Call
const response = await fetch('/api/narrative/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teamId: 'alabama',
    opponentId: 'auburn',
    gameId: 'game_123',
  }),
});

const { data } = await response.json();
// data.narrativeMomentum: -0.30 to +0.30
```

### Phase 3: Information Asymmetry Index (IAI)

```typescript
// API Call
const response = await fetch('/api/iai/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gameId: 'game_123',
    lineMovement: [...],
    betSplits: {...},
  }),
});

const { data } = await response.json();
// data.iai: -0.1 to +0.1
```

### Phase 4: Chaos Sensitivity Index (CSI)

```typescript
// API Call
const response = await fetch('/api/csi/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gameId: 'game_123',
    context: {
      weather: {
        windSpeed: 22,
        windGusts: 38,
        precipitationType: 'snow',
      },
      roster: {
        clusterInjuries: {
          offensiveLine: 2,  // 2 OL starters out
          defensiveBacks: 1,
        },
      },
      referee: {
        crewId: 'crew_123',
        homeTeamStyle: {
          reliesOnHolding: true,
        },
      },
      schedule: {
        travelLag: {
          fromTimezone: 'PST',
          toTimezone: 'EST',
          kickoffTime: '13:00',
        },
      },
    },
  }),
});

const { data } = await response.json();
// data.csiScore: 0.0 to 1.0 (affects CONFIDENCE, not probability)
// data.recommendation: 'PASS' | 'small' | 'medium' | 'large'
```

### Phase 5: Network Influence Graph (NIG)

```typescript
// API Call
const response = await fetch('/api/nig/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teamId: 'alabama',
    gameId: 'game_123',
    players: [
      { id: 'p1', name: 'Player 1', position: 'QB', role: 'starter', importance: 1.0 },
      // ... more players
    ],
    relationships: [
      {
        from: 'p1',
        to: 'p2',
        type: 'teammate',
        strength: 0.8,
        direction: 'bidirectional',
      },
      // ... more relationships
    ],
  }),
});

const { data } = await response.json();
// data.networkInfluence: -0.1 to +0.1
```

### Phase 6: Temporal Relevance Decay (TRD)

```typescript
// API Call
const response = await fetch('/api/temporal/decay', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sport: 'nfl',
    events: [
      {
        daysAgo: 2,
        impact: 0.15,
        type: 'blowout_loss',
        description: 'Lost by 30 points',
      },
      {
        daysAgo: 7,
        impact: 0.10,
        type: 'key_injury',
        description: 'Star player injured',
      },
    ],
  }),
});

const { data } = await response.json();
// data.decayFactor: 0.5 to 1.0 (multiplier for all dimensions)
```

### Phase 7: Emergent Pattern Detection (EPD)

```typescript
// API Call
const response = await fetch('/api/emergent/detect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    context: {
      teamId: 'alabama',
      opponentId: 'auburn',
      gameData: {
        homeTeam: 'Alabama',
        awayTeam: 'Auburn',
        league: 'NCAA',
        sport: 'football',
        // ... full game data
      },
    },
  }),
});

const { data } = await response.json();
// data.combinedScore: -0.1 to +0.1
// data.insights: ['Pattern: ...', ...]
```

---

## Complete Integration Example

```typescript
import { ClaudeEffectEngine } from './app/lib/claude-effect';

async function getFullClaudeEffect(gameData: any) {
  const engine = new ClaudeEffectEngine();

  // Gather all dimension data
  const [sentiment, narrative, iai, csi, nig, temporal, emergent] = await Promise.all([
    fetch('/api/sentiment/calculate', {
      method: 'POST',
      body: JSON.stringify({ teamId: gameData.homeTeam, gameId: gameData.id }),
    }).then(r => r.json()),

    fetch('/api/narrative/calculate', {
      method: 'POST',
      body: JSON.stringify({
        teamId: gameData.homeTeam,
        opponentId: gameData.awayTeam,
        gameId: gameData.id
      }),
    }).then(r => r.json()),

    fetch('/api/iai/calculate', {
      method: 'POST',
      body: JSON.stringify({ gameId: gameData.id, lineMovement: gameData.lineMovement }),
    }).then(r => r.json()),

    fetch('/api/csi/calculate', {
      method: 'POST',
      body: JSON.stringify({ gameId: gameData.id, context: gameData.chaosContext }),
    }).then(r => r.json()),

    fetch('/api/nig/calculate', {
      method: 'POST',
      body: JSON.stringify({
        teamId: gameData.homeTeam,
        gameId: gameData.id,
        players: gameData.players,
        relationships: gameData.relationships,
      }),
    }).then(r => r.json()),

    fetch('/api/temporal/decay', {
      method: 'POST',
      body: JSON.stringify({
        sport: gameData.sport,
        events: gameData.recentEvents,
      }),
    }).then(r => r.json()),

    fetch('/api/emergent/detect', {
      method: 'POST',
      body: JSON.stringify({
        context: {
          teamId: gameData.homeTeam,
          opponentId: gameData.awayTeam,
          gameData,
        },
      }),
    }).then(r => r.json()),
  ]);

  // Calculate full Claude Effect
  const result = await engine.calculateClaudeEffect(
    gameData.baseProbability,
    gameData.baseConfidence,
    gameData,
    {
      sentiment: sentiment.data,
      narratives: narrative.data,
      informationAsymmetry: iai.data,
      chaosFactors: csi.data,
      network: nig.data,
      temporal: temporal.data.events,
      emergent: emergent.data,
    }
  );

  return result;
}
```

---

## Integration with Prediction Engine

```typescript
// In prediction-engine.ts or analyze-game route

import { ClaudeEffectEngine } from '../lib/claude-effect';

export async function generatePrediction(gameData: GameData) {
  // 1. Calculate base prediction (statistical models)
  const basePrediction = statisticalModel(gameData);

  // 2. Apply Claude Effect
  const claudeEngine = new ClaudeEffectEngine();
  const claudeResult = await claudeEngine.calculateClaudeEffect(
    basePrediction.winProbability,
    basePrediction.confidence,
    gameData,
    await gatherClaudeData(gameData)
  );

  // 3. Apply CSI to confidence (not probability)
  const finalConfidence = claudeResult.adjustedConfidence;

  // 4. Generate bet recommendation
  const betRecommendation = generateBetRecommendation(
    claudeResult.adjustedProbability,
    finalConfidence,
    claudeResult.recommendations.betSize
  );

  return {
    predictedWinner: basePrediction.winner,
    probability: claudeResult.adjustedProbability,
    confidence: finalConfidence,
    betRecommendation,
    claudeEffect: {
      scores: claudeResult.scores,
      reasoning: claudeResult.reasoning,
      warnings: claudeResult.warnings,
    },
  };
}
```

---

## Data Collection Requirements

### Phase 1 (SF): Sentiment Data
- Twitter/X API access
- Instagram scraping (or API)
- News RSS feeds
- Press conference transcripts

### Phase 2 (NM): Narrative Data
- Schedule data
- Roster history
- Rivalry mappings
- News headlines

### Phase 3 (IAI): Betting Market Data
- Line movement history
- Bet splits (handle vs tickets)
- Odds API integration

### Phase 4 (CSI): Chaos Data
- Weather API (OpenWeatherMap)
- Injury reports
- Referee crew database
- Travel/timezone data

### Phase 5 (NIG): Network Data
- Social media interactions
- Roster relationships
- Team chemistry metrics

### Phase 6 (TRD): Temporal Data
- Recent events timeline
- Event categorization

### Phase 7 (EPD): Pattern Data
- Historical game outcomes (10+ years)
- ML model training data

---

## Performance Optimization

### Caching Strategy

```typescript
// Cache dimension results (they don't change frequently)
const cache = new Map<string, any>();

async function getCachedDimension(key: string, fetcher: () => Promise<any>) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = await fetcher();
  cache.set(key, result);

  // Expire after 1 hour
  setTimeout(() => cache.delete(key), 60 * 60 * 1000);

  return result;
}
```

### Parallel Processing

```typescript
// All dimensions can be calculated in parallel
const dimensions = await Promise.all([
  calculateSF(teamId),
  calculateNM(teamId, opponentId),
  calculateIAI(gameId),
  calculateCSI(gameData),
  calculateNIG(teamId),
  calculateTRD(events),
  calculateEPD(context),
]);
```

---

## Error Handling

```typescript
async function safeCalculateDimension(
  name: string,
  calculator: () => Promise<any>
): Promise<any> {
  try {
    return await calculator();
  } catch (error) {
    console.warn(`[Claude Effect] ${name} calculation failed:`, error);
    // Return neutral value (0 or 1.0 depending on dimension)
    return getNeutralValue(name);
  }
}

function getNeutralValue(dimension: string): any {
  const neutralValues: Record<string, any> = {
    sentiment: 0,
    narrative: 0,
    iai: 0,
    csi: 0,
    nig: 0,
    temporal: 1.0,  // No decay
    emergent: 0,
  };
  return neutralValues[dimension] || 0;
}
```

---

## Testing

```typescript
// Test individual dimensions
describe('Claude Effect', () => {
  it('should calculate Sentiment Field', async () => {
    const result = await calculateSF('alabama');
    expect(result.sentimentField).toBeGreaterThanOrEqual(-0.2);
    expect(result.sentimentField).toBeLessThanOrEqual(0.2);
  });

  it('should calculate full Claude Effect', async () => {
    const result = await engine.calculateClaudeEffect(0.65, 0.75, gameData, context);
    expect(result.adjustedProbability).toBeGreaterThan(0);
    expect(result.adjustedProbability).toBeLessThan(1);
    expect(result.adjustedConfidence).toBeGreaterThan(0);
    expect(result.adjustedConfidence).toBeLessThan(1);
  });
});
```

---

## 🐘 ROLL TIDE!

This integration guide covers all 7 phases of The Claude Effect. Use it to integrate the complete framework into your prediction engine.

