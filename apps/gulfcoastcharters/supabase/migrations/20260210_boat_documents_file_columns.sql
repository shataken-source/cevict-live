-- Boat documentation: file storage columns for upload/list
ALTER TABLE public.boat_documents
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT;

COMMENT ON COLUMN public.boat_documents.status IS 'verification: verified, pending, or expired';
