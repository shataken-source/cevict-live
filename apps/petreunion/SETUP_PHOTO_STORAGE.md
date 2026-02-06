# 📸 Photo Storage Setup Guide

## Quick Setup

### Step 1: Create Storage Bucket

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to your PRO Supabase project: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo
2. Click **Storage** in the left sidebar
3. Click **"New bucket"** button
4. Configure:
   - **Name:** `pet-photos`
   - **Public:** ✅ **YES** (required for public photo URLs)
   - **File size limit:** `5242880` (5MB)
   - **Allowed MIME types:** `image/jpeg,image/jpg,image/png,image/webp,image/gif`
5. Click **"Create bucket"**

**Option B: Via Supabase CLI**
```bash
supabase storage create pet-photos --public --file-size-limit 5242880
```

**Option C: Via API (PowerShell)**
```powershell
$headers = @{
    "apikey" = "YOUR_SERVICE_ROLE_KEY"
    "Authorization" = "Bearer YOUR_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    name = "pet-photos"
    public = $true
    file_size_limit = 5242880
    allowed_mime_types = @("image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif")
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://rdbuwyefbgnbuhmjrizo.supabase.co/storage/v1/bucket" -Method Post -Headers $headers -Body $body
```

### Step 2: Verify Bucket Created

Run this in Supabase SQL Editor:
```sql
SELECT name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE name = 'pet-photos';
```

Should return:
- `name`: `pet-photos`
- `public`: `true`
- `file_size_limit`: `5242880`
- `allowed_mime_types`: Array of image types

### Step 3: Test Photo Upload

1. Go to your PetReunion app: `http://localhost:3006/report/lost`
2. Fill out the form
3. Click "Click to upload a photo"
4. Select an image file
5. Submit the form
6. Check that photo appears in Storage bucket

---

## What Was Implemented

### ✅ Photo Upload API
- **Endpoint:** `POST /api/upload-photo`
- **Accepts:** `multipart/form-data` with `photo` field
- **Validates:** File type, file size (5MB max)
- **Returns:** Public URL of uploaded photo

### ✅ Updated Forms
- **Report Lost Pet:** Now includes photo upload
- **Report Found Pet:** Now includes photo upload
- **Features:**
  - Drag & drop or click to upload
  - Photo preview before submission
  - Remove photo option
  - Upload progress indicator

### ✅ API Routes Updated
- **`/api/report-lost`:** Now accepts `photo_url` field
- **`/api/report-found`:** Now accepts `photo_url` field
- Both routes store the photo URL in database

---

## File Structure

```
apps/petreunion/
├── app/
│   ├── api/
│   │   └── upload-photo/
│   │       └── route.ts          # NEW: Photo upload endpoint
│   └── report/
│       ├── lost/
│       │   └── page.tsx          # UPDATED: Added photo upload
│       └── found/
│           └── page.tsx          # UPDATED: Added photo upload
└── supabase/
    └── setup-photo-storage.sql   # NEW: Storage setup guide
```

---

## How It Works

1. **User selects photo** → File validated (type, size)
2. **Photo preview shown** → User can remove if needed
3. **Form submitted** → Photo uploaded to Storage first
4. **Photo URL received** → Included in pet report submission
5. **Pet saved** → With `photo_url` pointing to Storage

---

## Storage Path Structure

Photos are stored as:
```
pet-photos/{timestamp}-{randomId}.{ext}
```

Example:
```
pet-photos/1704067200000-a3f9k2m8.jpg
```

Public URL format:
```
https://rdbuwyefbgnbuhmjrizo.supabase.co/storage/v1/object/public/pet-photos/{filename}
```

---

## Next Steps

1. ✅ **Create Storage bucket** (see Step 1 above)
2. ✅ **Test photo upload** on report forms
3. 🔄 **Update scrapers** to preserve real photos when available
4. 🔄 **Implement image matching** (future)

---

## Troubleshooting

**Error: "Bucket not found"**
- Make sure you created the `pet-photos` bucket
- Check bucket name spelling (must be exact: `pet-photos`)

**Error: "Upload failed"**
- Check file size (must be < 5MB)
- Check file type (must be image)
- Verify Storage bucket is public

**Photo not displaying**
- Check that bucket is set to **public**
- Verify photo URL is correct
- Check browser console for CORS errors

---

## Security Notes

- ✅ File type validation (only images)
- ✅ File size limit (5MB max)
- ✅ Unique filenames (timestamp + random ID)
- ✅ Public bucket (photos need to be accessible)
- ⚠️ No authentication required (public uploads)
- 💡 Consider adding rate limiting for uploads in future
