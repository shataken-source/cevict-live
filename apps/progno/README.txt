# PROGNO - AI Prediction Engine

## Overview

PROGNO is a sophisticated prediction engine supporting:
- Sports betting analysis
- Travel planning
- Pet recovery forecasting
- Generic predictions

## Your Original Engine (Preserved)

All your core files remain unchanged:
- Your prediction logic
- Your data gathering
- Your type definitions
- Your API

## Enhancements (Optional)

The `enhancements/` folder contains optional additions:

### Input Validation
```typescript
import { validateInput } from './enhancements/validator';
const bubble = await createBubble('sports', validateInput('sports', input));
```

### Logging
```typescript
import { withLogging } from './enhancements/logger';
export const createBubble = withLogging(original, 'createBubble');
```

### Rate Limiting
```typescript
import { withRateLimit } from './enhancements/rate-limiter';
const data = await withRateLimit(() => fetch(url));
```

### Strategy Enhancement
```typescript
import { enhancePrediction } from './enhancements/strategy-enhancer';
const enhanced = await enhancePrediction(game, teams, yourOriginalPrediction);
```

## Installation
```bash
npm install zod winston bottleneck
npm test
```

## Key Point

Your engine = Untouched ✅
Enhancements = Optional additions ✅