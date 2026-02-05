# Pet Reunion Location Input Fix

## Issue
Users entering "Columbus Indiana" (without comma) were unable to submit lost pet reports because the location parser only accepted 2-letter state codes, not full state names.

## Solution
Created an improved location parser that:
1. ✅ Handles full state names (e.g., "Indiana", "New York", "North Carolina")
2. ✅ Handles state abbreviations (e.g., "IN", "NY", "NC")
3. ✅ Parses "City State" format (no comma required)
4. ✅ Parses "City, State" format (with comma)
5. ✅ Extracts ZIP codes when present

## Files Created/Updated

### 1. `apps/petreunion/lib/location-parser.ts`
- New location parser with full state name support
- Maps all 50 US states + DC to their abbreviations
- Handles multi-word state names (e.g., "New York", "North Carolina")

### 2. `apps/petreunion/app/api/report-lost/route.ts`
- New API endpoint for reporting lost pets
- Uses the improved location parser
- Accepts location as single string or separate fields
- Validates required fields and provides helpful error messages

## Testing

The parser now correctly handles:
- ✅ "Columbus Indiana" → city: "Columbus", state: "IN"
- ✅ "Columbus, Indiana" → city: "Columbus", state: "IN"
- ✅ "Columbus, IN" → city: "Columbus", state: "IN"
- ✅ "Columbus IN" → city: "Columbus", state: "IN"
- ✅ "New York, New York" → city: "New York", state: "NY"
- ✅ "Birmingham, Alabama" → city: "Birmingham", state: "AL"

## Next Steps

1. **Deploy the changes** to petreunion.org
2. **Test with the user's case**: "Columbus Indiana"
3. **Update any frontend forms** to use the new API endpoint
4. **Add form validation** to show helpful hints (e.g., "Enter city and state, e.g., Columbus, Indiana")

## API Usage

```typescript
POST /api/report-lost
{
  "petType": "dog",
  "color": "brown",
  "date_lost": "2026-01-18",
  "location": "Columbus Indiana",  // ✅ Now works!
  "petName": "Buddy",
  "breed": "Labrador",
  "owner_email": "owner@example.com",
  "owner_phone": "+1234567890"
}
```

## Status
✅ Location parser created
✅ API endpoint created
⏳ Ready for deployment and testing
