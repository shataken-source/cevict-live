-- Media Uploads System
-- Created by Cascade

CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  duration_seconds INTEGER,
  is_public BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.media_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES public.media(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(media_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_media_user_id ON public.media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_media_type ON public.media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_usage_media ON public.media_usage(media_id);
CREATE INDEX IF NOT EXISTS idx_media_usage_entity ON public.media_usage(entity_type, entity_id);

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own media"
  ON public.media
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public media"
  ON public.media
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert their own media"
  ON public.media
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media"
  ON public.media
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media"
  ON public.media
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view media usage for their media"
  ON public.media_usage
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.media 
    WHERE media.id = media_usage.media_id 
    AND media.user_id = auth.uid()
  ));

CREATE POLICY "Users can create media usage for their media"
  ON public.media_usage
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.media 
    WHERE media.id = media_usage.media_id 
    AND media.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete media usage for their media"
  ON public.media_usage
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.media 
    WHERE media.id = media_usage.media_id 
    AND media.user_id = auth.uid()
  ));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  500 * 1024 * 1024,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv'
  ]
)
ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Users can upload their own media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own media in storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public media can be viewed by anyone"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media' AND
    EXISTS (
      SELECT 1 FROM public.media
      WHERE media.storage_path = storage.objects.name
      AND media.is_public = true
    )
  );

CREATE POLICY "Users can update their own media in storage"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own media in storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE OR REPLACE FUNCTION public.calculate_video_cost(duration_seconds INTEGER)
RETURNS INTEGER AS $$
DECLARE
  minutes NUMERIC;
  cost INTEGER;
BEGIN
  IF duration_seconds IS NULL THEN
    RETURN 0;
  END IF;
  minutes := CEIL(duration_seconds::NUMERIC / 60);
  cost := GREATEST(1, FLOOR(minutes)) * 10;
  RETURN cost;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.handle_media_upload()
RETURNS TRIGGER AS $$
DECLARE
  file_metadata JSONB;
  media_type TEXT;
  duration_seconds INTEGER;
  cost INTEGER := 0;
  user_balance INTEGER;
  file_name_parts TEXT[];
  file_name_only TEXT;
  content_type TEXT;
  file_size INTEGER;
  storage_path TEXT;
  media_id UUID;
  is_image BOOLEAN;
  is_video BOOLEAN;
  allowed_image_types TEXT[] := ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  allowed_video_types TEXT[] := ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];
BEGIN
  SELECT 
    metadata,
    name,
    mimetype,
    size
  INTO file_metadata, storage_path, content_type, file_size
  FROM storage.objects
  WHERE id = NEW.id;

  is_image := content_type = ANY(allowed_image_types);
  is_video := content_type = ANY(allowed_video_types);

  IF is_image THEN
    media_type := 'image';
    duration_seconds := NULL;
  ELSIF is_video THEN
    media_type := 'video';
    duration_seconds := NULLIF(file_metadata->>'duration', '')::INTEGER;
  ELSE
    RAISE EXCEPTION 'Unsupported media type: %', content_type;
  END IF;

  IF media_type = 'video' THEN
    cost := public.calculate_video_cost(COALESCE(duration_seconds, 0));
    SELECT public.get_user_points(NEW.owner) INTO user_balance;
    IF user_balance < cost THEN
      DELETE FROM storage.objects WHERE id = NEW.id;
      RAISE EXCEPTION 'Insufficient points. Video upload costs % points, but you only have % points.', cost, user_balance;
    END IF;
  END IF;

  file_name_parts := string_to_array(storage_path, '/');
  file_name_only := file_name_parts[array_length(file_name_parts, 1)];

  INSERT INTO public.media (
    user_id,
    storage_path,
    file_name,
    file_size,
    mime_type,
    media_type,
    duration_seconds,
    is_public,
    metadata
  )
  VALUES (
    NEW.owner,
    storage_path,
    file_name_only,
    file_size,
    content_type,
    media_type,
    duration_seconds,
    false,
    COALESCE(file_metadata, '{}'::jsonb)
  )
  RETURNING id INTO media_id;

  IF cost > 0 THEN
    PERFORM public.award_points(
      NEW.owner,
      -cost,
      'media_upload',
      media_id,
      'Video upload: ' || file_name_only
    );
  END IF;

  UPDATE storage.objects
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('media_id', media_id::text)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_media_upload ON storage.objects;
CREATE TRIGGER on_media_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'media')
  EXECUTE FUNCTION public.handle_media_upload();

CREATE OR REPLACE FUNCTION public.get_media_url(media_id UUID)
RETURNS TEXT AS $$
DECLARE
  media_record RECORD;
  url TEXT;
BEGIN
  SELECT m.*, o.id as storage_object_id
  INTO media_record
  FROM public.media m
  LEFT JOIN storage.objects o ON m.storage_path = o.name
  WHERE m.id = media_id;

  IF media_record.storage_object_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF media_record.is_public THEN
    SELECT storage.get_public_url('media', media_record.storage_path) INTO url;
  ELSE
    SELECT storage.get_presigned_url('media', media_record.storage_path, 3600) INTO url;
  END IF;

  RETURN url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_media(user_uuid UUID, include_private BOOLEAN DEFAULT false)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  media_type TEXT,
  duration_seconds INTEGER,
  is_public BOOLEAN,
  url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.file_name,
    m.file_size,
    m.mime_type,
    m.media_type,
    m.duration_seconds,
    m.is_public,
    public.get_media_url(m.id) as url,
    m.created_at,
    m.updated_at
  FROM public.media m
  WHERE m.user_id = user_uuid
  AND (include_private OR m.is_public = true)
  ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.can_upload_video(user_uuid UUID, duration_seconds INTEGER DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  cost INTEGER;
  user_balance INTEGER;
  max_duration_seconds INTEGER := 600;
  max_file_size_bytes BIGINT := 500 * 1024 * 1024;
BEGIN
  cost := public.calculate_video_cost(COALESCE(duration_seconds, 0));
  SELECT public.get_user_points(user_uuid) INTO user_balance;

  RETURN jsonb_build_object(
    'can_upload', user_balance >= cost,
    'cost', cost,
    'user_balance', user_balance,
    'max_duration_seconds', max_duration_seconds,
    'max_file_size_bytes', max_file_size_bytes,
    'allowed_video_types', ARRAY[
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv'
    ]
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.delete_media(media_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  media_record RECORD;
  deleted_count INTEGER;
BEGIN
  SELECT * INTO media_record 
  FROM public.media 
  WHERE id = media_id AND user_id = auth.uid();

  IF media_record IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM storage.objects 
  WHERE name = media_record.storage_path
  RETURNING 1 INTO deleted_count;

  IF deleted_count > 0 THEN
    DELETE FROM public.media WHERE id = media_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_media_visibility(media_id UUID, is_public BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.media
  SET is_public = is_public
  WHERE id = media_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
