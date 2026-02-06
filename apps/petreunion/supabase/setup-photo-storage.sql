-- ============================================
-- Setup Supabase Storage for Pet Photos
-- Run this in your PRO Supabase SQL Editor
-- ============================================

-- Note: Storage buckets must be created via Supabase Dashboard or Storage API
-- This SQL script provides the RLS policies for the bucket

-- ============================================
-- Storage Bucket Setup (Manual Step Required)
-- ============================================
-- 
-- You need to create the bucket manually:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Name: "pet-photos"
-- 4. Public: YES (so photos can be accessed via public URLs)
-- 5. File size limit: 5MB (or your preference)
-- 6. Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif
--
-- OR use the Storage API:
-- POST https://rdbuwyefbgnbuhmjrizo.supabase.co/storage/v1/bucket
-- {
--   "name": "pet-photos",
--   "public": true,
--   "file_size_limit": 5242880,
--   "allowed_mime_types": ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
-- }

-- ============================================
-- RLS Policies for pet-photos bucket
-- ============================================

-- Allow public to read (view photos)
-- Note: This is handled by making the bucket public, but we can add explicit policies

-- Allow authenticated users to upload
-- Note: Since we're using service role for uploads, this may not be needed
-- But it's good to have for future authenticated uploads

-- Allow service role to upload/delete (for API)
-- Service role bypasses RLS, so this is mainly for documentation

-- ============================================
-- Verification Query
-- ============================================
-- After creating the bucket, verify it exists:
-- SELECT * FROM storage.buckets WHERE name = 'pet-photos';

-- ============================================
-- Test Upload (Optional)
-- ============================================
-- You can test the upload API endpoint:
-- POST /api/upload-photo
-- FormData with 'photo' file field

COMMENT ON SCHEMA storage IS 'Supabase Storage - pet-photos bucket should be created here';
