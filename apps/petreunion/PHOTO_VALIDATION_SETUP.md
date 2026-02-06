# 🐾 Photo Validation Setup

## Overview

Photo validation ensures uploaded images are **actually photos of pets** (dogs/cats), not random images, memes, screenshots, or inappropriate content.

## How It Works

### Validation Modes

Set via environment variable: `PETREUNION_PHOTO_VALIDATION_MODE`

- **`off`** - No validation (accepts any image)
- **`soft`** - Basic checks only (image format, size) - **Default**
- **`strict`** - Full AI validation (requires OpenAI API key)

### Validation Steps

1. **Basic Checks** (always runs):
   - File is a valid image format
   - Image is readable (not corrupted)
   - Image dimensions >= 64x64 pixels
   - File size <= 6MB

2. **AI Validation** (if OpenAI configured):
   - Uses OpenAI Vision API (GPT-4o-mini)
   - Verifies image contains a real pet (dog/cat)
   - Rejects: memes, screenshots, text, logos, selfies, food, random objects, AI art
   - Returns: `ok`, `pet_type` (dog/cat/other), `confidence` (0-1), `reason`

## Setup

### Step 1: Install Dependencies

```bash
cd apps/petreunion
npm install sharp
```

### Step 2: Configure Environment Variables

Add to your `.env.local` or Vercel environment:

```bash
# Photo Validation Mode (off | soft | strict)
PETREUNION_PHOTO_VALIDATION_MODE=soft

# OpenAI API Key (required for strict mode or AI validation)
OPENAI_API_KEY=sk-...

# Optional: Custom OpenAI endpoint
OPENAI_BASE_URL=https://api.openai.com

# Optional: OpenAI model (default: gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini
```

### Step 3: Test Validation

1. Upload a pet photo → Should pass ✅
2. Upload a random image → Should fail ❌
3. Upload a meme → Should fail ❌

## Validation Modes Explained

### `off` Mode
- **No validation** - Accepts any image file
- **Use case:** Development, testing
- **Risk:** Users can upload anything

### `soft` Mode (Default)
- **Basic validation only** - Checks image format and size
- **No AI validation** - Doesn't verify pet content
- **Use case:** Production without OpenAI API
- **Risk:** Users can upload non-pet images (but must be valid images)

### `strict` Mode
- **Full AI validation** - Uses OpenAI to verify pet content
- **Requires:** `OPENAI_API_KEY` environment variable
- **Use case:** Production with content moderation
- **Risk:** Rejects valid pet photos if OpenAI is down/unavailable

## API Response

When validation fails, the API returns:

```json
{
  "error": "Photo validation failed",
  "reason": "Not a pet photo",
  "details": "The uploaded image does not appear to be a pet photo. Not a pet photo"
}
```

## Cost Considerations

- **OpenAI API:** ~$0.01-0.02 per image validation
- **Sharp (image processing):** Free, local processing
- **Recommendation:** Use `soft` mode for basic validation, `strict` for production with moderation

## Troubleshooting

**Error: "Photo validation unavailable (missing OPENAI_API_KEY)"**
- Set `OPENAI_API_KEY` environment variable
- Or use `soft` mode instead of `strict`

**Error: "Invalid image file"**
- Image is corrupted or not a valid format
- Check file extension matches actual format

**Error: "Image too small"**
- Image must be at least 64x64 pixels
- Resize image before uploading

**Validation too strict?**
- Set mode to `soft` for basic checks only
- Or set mode to `off` to disable validation

## Files

- **`lib/photo-validation.ts`** - Validation logic
- **`app/api/upload-photo/route.ts`** - Uses validation before upload
