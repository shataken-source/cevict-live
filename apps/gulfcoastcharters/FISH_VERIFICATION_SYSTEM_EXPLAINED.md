# 🐟 Fish Verification System - How It Works

**Status:** ⚠️ **Frontend Complete, Backend Edge Function Missing**

---

## Overview

The Fish Verification System (also called "AI Fish Species Recognition") uses AI to automatically identify fish species from photos, estimate weight/length, and pre-fill catch logging forms.

---

## How It Works

### 1. **User Flow**

```
1. User takes/uploads catch photo in CatchLogger
   ↓
2. Photo appears with GPS location data
   ↓
3. "AI Species Recognition" card appears below photo
   ↓
4. User clicks "Identify Fish Species" button
   ↓
5. Frontend calls: supabase.functions.invoke('fish-species-recognition')
   ↓
6. Edge function analyzes image (2-3 seconds)
   ↓
7. Results displayed:
   - Primary species match with confidence badge
   - Estimated weight and length
   - Alternative species suggestions
   ↓
8. User can:
   - ✅ Accept → Auto-fills form (+5 points)
   - ❌ Correct → Select correct species (+10 points)
```

### 2. **Technical Architecture**

```
┌─────────────────────────────────┐
│   CatchLogger Component          │
│   - Photo upload/capture         │
│   - GPS location                 │
│   - Form fields                  │
└──────────────┬──────────────────┘
               │
               │ Renders
               ↓
┌─────────────────────────────────┐
│   FishSpeciesRecognition        │
│   Component                     │
│   - "Identify Fish" button      │
│   - Results display             │
│   - Accept/Correct actions      │
└──────────────┬──────────────────┘
               │
               │ API Call
               ↓
┌─────────────────────────────────┐
│   fish-species-recognition      │
│   Edge Function (MISSING)       │
│   - Receives imageUrl/base64    │
│   - Calls Google Vision API     │
│   - Matches against species DB  │
│   - Returns identification      │
└──────────────┬──────────────────┘
               │
               │ API Call
               ↓
┌─────────────────────────────────┐
│   Google Cloud Vision API       │
│   - Label detection             │
│   - Web entity detection        │
│   - Returns labels/scores       │
└─────────────────────────────────┘
```

---

## Current Implementation Status

### ✅ **Implemented (Frontend)**

1. **Component: `FishSpeciesRecognition.tsx`**
   - Location: `src/components/FishSpeciesRecognition.tsx`
   - Features:
     - Image analysis trigger
     - Results display with confidence badges
     - Accept/Correct actions
     - Alternative species selection
     - Gamification integration (+5 for use, +10 for correction)

2. **Integration: `CatchLogger.tsx`**
   - Location: `src/components/CatchLogger.tsx`
   - Features:
     - Photo upload/capture
     - GPS location capture
     - Auto-fills form when AI result accepted
     - Points awarded for AI usage

3. **Gamification Integration**
   - Uses AI recognition: +5 points (`ai_recognition_use`)
   - Corrects AI prediction: +10 points (`ai_correction`)
   - Integrated with `points-rewards-system` edge function

### ❌ **Missing (Backend)**

1. **Edge Function: `fish-species-recognition`**
   - Should be at: `supabase/functions/fish-species-recognition/index.ts`
   - **Status:** NOT CREATED YET
   - **Required:**
     - Google Cloud Vision API integration
     - Species database matching
     - Weight/length estimation
     - Correction logging

---

## What the Edge Function Should Do

### **Action: `identify`**

**Input:**
```typescript
{
  action: 'identify',
  imageUrl?: string,        // URL to image
  imageBase64?: string      // Base64 encoded image
}
```

**Process:**
1. Download/decode image
2. Call Google Cloud Vision API:
   - Label Detection (identifies objects)
   - Web Entity Detection (finds related entities)
3. Match labels against species database:
   - Keywords: "snapper", "grouper", "mahi", etc.
   - Confidence scoring
4. Return top match + alternatives

**Output:**
```typescript
{
  success: true,
  identification: {
    species: 'Red Snapper',
    confidence: 0.85,
    estimatedWeight: 8,      // lbs
    estimatedLength: 24,     // inches
    alternatives: [
      { species: 'Grouper', confidence: 0.45, estimatedWeight: 15, estimatedLength: 30 },
      { species: 'Redfish', confidence: 0.32, estimatedWeight: 10, estimatedLength: 28 }
    ]
  },
  rawLabels: [
    { label: 'Fish', score: 0.98 },
    { label: 'Snapper', score: 0.87 },
    { label: 'Red Snapper', score: 0.85 }
  ]
}
```

### **Action: `submit_correction`**

**Input:**
```typescript
{
  action: 'submit_correction',
  imageUrl: string,
  predictedSpecies: string,
  actualSpecies: string,
  confidence: number
}
```

**Process:**
1. Log correction to database (for future model training)
2. Store image + prediction + actual for analysis
3. Return success

**Output:**
```typescript
{
  success: true,
  message: 'Correction logged for model improvement'
}
```

---

## Supported Species Database

The system should recognize these Gulf Coast species:

| Species | Avg Weight | Avg Length | Keywords |
|---------|-----------|-----------|----------|
| Red Snapper | 8 lbs | 24" | snapper, red snapper |
| Grouper | 15 lbs | 30" | grouper, bass |
| Mahi Mahi | 20 lbs | 36" | mahi, dolphin fish, dorado |
| King Mackerel | 25 lbs | 40" | mackerel, kingfish |
| Redfish | 10 lbs | 28" | redfish, red drum |
| Speckled Trout | 3 lbs | 20" | trout, speckled |
| Tarpon | 80 lbs | 60" | tarpon, silver king |
| Snook | 12 lbs | 32" | snook, robalo |
| Cobia | 35 lbs | 45" | cobia, lemonfish |
| Amberjack | 40 lbs | 48" | amberjack, jack |

---

## Confidence Scoring

The system uses confidence badges:

- **High Confidence (70%+)**: 🟢 Green badge
- **Medium Confidence (40-69%)**: 🟡 Yellow badge
- **Low Confidence (<40%)**: 🔴 Red badge

---

## Environment Variables Required

### For Edge Function:

```bash
GOOGLE_CLOUD_VISION_API_KEY=your_google_vision_api_key
# OR
GOOGLE_VISION_API_KEY=your_google_vision_api_key
```

**Note:** Check `ENVIRONMENT_VARIABLES_COMPLETE.md` for current variable names.

---

## Integration Points

### 1. **CatchLogger Component**
- Shows `FishSpeciesRecognition` when photo is uploaded
- Auto-fills form when user accepts AI result
- Awards points for AI usage

### 2. **Gamification System**
- `ai_recognition_use`: +5 points
- `ai_correction`: +10 points
- Integrated via `points-rewards-system` edge function

### 3. **Database (Future)**
- Store corrections for model training
- Track accuracy metrics
- Improve predictions over time

---

## What Needs to Be Done

### ⚠️ **Critical: Create Edge Function**

1. **Create:** `supabase/functions/fish-species-recognition/index.ts`
2. **Implement:**
   - Google Cloud Vision API integration
   - Species matching algorithm
   - Weight/length estimation
   - Correction logging
3. **Deploy:** `supabase functions deploy fish-species-recognition`
4. **Set Secret:** `GOOGLE_CLOUD_VISION_API_KEY` in Supabase dashboard

### 📋 **Optional Enhancements**

1. **Database Table for Corrections:**
   ```sql
   CREATE TABLE fish_recognition_corrections (
     id UUID PRIMARY KEY,
     image_url TEXT,
     predicted_species TEXT,
     actual_species TEXT,
     confidence DECIMAL,
     user_id UUID,
     created_at TIMESTAMPTZ
   );
   ```

2. **Species Database Table:**
   ```sql
   CREATE TABLE fish_species (
     id UUID PRIMARY KEY,
     name TEXT,
     avg_weight DECIMAL,
     avg_length DECIMAL,
     keywords TEXT[],
     region TEXT
   );
   ```

3. **Custom ML Model (Future):**
   - Train on user corrections
   - Improve accuracy over time
   - Reduce API costs

---

## Testing

### Current State:
- ✅ Frontend component works (UI renders)
- ❌ Edge function missing (API call will fail)
- ✅ Gamification integration ready

### To Test (Once Edge Function Created):

1. Upload fish photo in CatchLogger
2. Click "Identify Fish Species"
3. Verify:
   - Species identified
   - Confidence score shown
   - Weight/length estimated
   - Form auto-filled
   - Points awarded

---

## Cost Considerations

- **Google Cloud Vision API:**
  - ~$1.50 per 1,000 images
  - First 1,000 images/month: **FREE**
  - Label Detection: $1.50 per 1,000
  - Web Detection: $1.50 per 1,000

**Optimization:**
- Cache common species
- Compress images before sending
- Consider custom model for scale

---

## Summary

**Current Status:**
- ✅ Frontend: **100% Complete**
- ❌ Backend: **0% Complete** (Edge function missing)

**Next Steps:**
1. Create `fish-species-recognition` edge function
2. Integrate Google Cloud Vision API
3. Implement species matching
4. Deploy and test
5. Monitor usage and costs

---

**Last Updated:** January 19, 2026  
**Documentation:** `docs/AI_FISH_RECOGNITION_GUIDE.md`  
**Component:** `src/components/FishSpeciesRecognition.tsx`  
**Edge Function:** `supabase/functions/fish-species-recognition/index.ts` ⚠️ **MISSING**
