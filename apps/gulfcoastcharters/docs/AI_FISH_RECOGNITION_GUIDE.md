# AI Fish Species Recognition System

## Overview
Gulf Coast Charters now features AI-powered fish species recognition that automatically identifies fish from photos, suggests weight/length estimates, and pre-fills the catch logger form.

## Features

### 1. **Automatic Species Identification**
- Uses Google Cloud Vision API for image analysis
- Identifies 10+ common Gulf Coast fish species
- Provides confidence scores for predictions
- Shows alternative species suggestions

### 2. **Weight & Length Estimates**
- Automatically suggests typical weight for identified species
- Provides average length measurements
- Pre-fills catch logger form fields

### 3. **Confidence Scoring**
- High Confidence: 70%+ (Green badge)
- Medium Confidence: 40-69% (Yellow badge)
- Low Confidence: <40% (Red badge)

### 4. **User Corrections**
- Users can correct misidentifications
- Corrections are logged for model improvement
- Alternative species shown for easy selection

## Supported Species

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

## How It Works

### User Flow
1. User takes/uploads catch photo
2. Photo appears in catch logger
3. "AI Species Recognition" card appears
4. User clicks "Identify Fish Species"
5. AI analyzes image (2-3 seconds)
6. Results show:
   - Primary species match with confidence
   - Estimated weight and length
   - Alternative species (if applicable)
7. User can:
   - Accept identification (auto-fills form)
   - Correct if wrong (helps improve AI)

### Technical Flow
```
Photo Upload
    ↓
FishSpeciesRecognition Component
    ↓
fish-species-recognition Edge Function
    ↓
Google Cloud Vision API
    ↓
Label Detection + Web Detection
    ↓
Match Against Fish Database
    ↓
Return Top Match + Alternatives
    ↓
Auto-fill Form Fields
```

## API Integration

### Edge Function: `fish-species-recognition`

**Endpoint:** `/functions/v1/fish-species-recognition`

**Actions:**

#### 1. Identify Species
```typescript
{
  action: 'identify',
  imageUrl: 'https://...',  // OR
  imageBase64: 'data:image/jpeg;base64,...'
}
```

**Response:**
```typescript
{
  success: true,
  identification: {
    species: 'Red Snapper',
    confidence: 0.85,
    estimatedWeight: 8,
    estimatedLength: 24,
    alternatives: [
      { species: 'Grouper', confidence: 0.45, ... },
      { species: 'Redfish', confidence: 0.32, ... }
    ]
  },
  rawLabels: [
    { label: 'Fish', score: 0.98 },
    { label: 'Snapper', score: 0.87 }
  ]
}
```

#### 2. Submit Correction
```typescript
{
  action: 'submit_correction',
  imageUrl: 'https://...',
  predictedSpecies: 'Red Snapper',
  actualSpecies: 'Grouper',
  confidence: 0.85
}
```

## Component Usage

### FishSpeciesRecognition Component

```tsx
import FishSpeciesRecognition from '@/components/FishSpeciesRecognition';

<FishSpeciesRecognition
  imageUrl={photoUrl}
  onSpeciesSelect={(species, weight, length) => {
    // Auto-fill form with AI predictions
    setFormData({
      species_id: findSpeciesId(species),
      weight: weight.toString(),
      length: length.toString()
    });
  }}
/>
```

### Integration with CatchLogger

The AI recognition is automatically shown when a photo is uploaded:
1. User takes/uploads photo
2. Photo displays with GPS overlay
3. AI Recognition card appears below
4. User clicks "Identify Fish Species"
5. Results auto-fill the form

## Improving Accuracy

### Current Approach
- Uses Google Cloud Vision labels
- Matches against keyword database
- Combines multiple detection methods

### Future Enhancements
1. **Custom ML Model**
   - Train on user-submitted corrections
   - Use TensorFlow.js for on-device processing
   - Faster inference, no API costs

2. **Expanded Database**
   - Add more Gulf Coast species
   - Include regional variations
   - Seasonal patterns

3. **Advanced Features**
   - Size estimation from reference objects
   - Weight prediction from image analysis
   - Species-specific measurement guides

## User Corrections System

When users correct misidentifications:
1. Original prediction and actual species logged
2. Confidence score recorded
3. Data stored for model retraining
4. Improves future predictions

**Future:** Use corrections to fine-tune custom model

## Mobile Optimization

- Works with camera capture
- Supports photo gallery uploads
- Analyzes compressed images (faster)
- EXIF data preserved for location

## Testing

### Test the AI Recognition

1. **Upload Test Photo:**
   - Go to Community → Log Catch
   - Upload or take photo of fish
   - Click "Identify Fish Species"

2. **Verify Results:**
   - Check confidence score
   - Review alternatives
   - Test "Use This" button
   - Try correction flow

3. **Test Species:**
   - Red Snapper (high confidence)
   - Grouper (medium confidence)
   - Mixed/unclear photos (low confidence)

## Troubleshooting

### "Could not identify fish species"
- Photo may not contain recognizable fish
- Try clearer, well-lit photo
- Ensure fish is primary subject

### Low Confidence Scores
- Photo quality issues
- Uncommon species
- Multiple fish in frame
- Use manual selection

### Wrong Species Identified
- Click "Wrong Species"
- Select correct species from alternatives
- Helps improve AI accuracy

## Environment Variables

Required in Supabase Edge Functions:
```
GOOGLE_CLOUD_VISION_API_KEY=your_api_key_here
```

Already configured in your project.

## Cost Considerations

- Google Cloud Vision: ~$1.50 per 1,000 images
- First 1,000 images/month: FREE
- Optimize by caching common species
- Consider switching to custom model for scale

## Next Steps

1. **Monitor Usage:** Track API calls and costs
2. **Collect Data:** Store corrections for training
3. **Build Custom Model:** Train on Gulf Coast species
4. **Add Features:** Size estimation, catch validation
5. **Expand Database:** More species, better matching

---

**Status:** ✅ Fully Implemented
**API:** Google Cloud Vision API
**Components:** FishSpeciesRecognition, CatchLogger
**Edge Function:** fish-species-recognition
