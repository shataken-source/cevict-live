-- Add message board source types to loyalty_source_type_enum
-- This allows points to be awarded for message board posts and replies

DO $$ 
BEGIN
  -- Check if enum values already exist before adding
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'message_post' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'loyalty_source_type_enum')
  ) THEN
    ALTER TYPE public.loyalty_source_type_enum ADD VALUE 'message_post';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'message_reply' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'loyalty_source_type_enum')
  ) THEN
    ALTER TYPE public.loyalty_source_type_enum ADD VALUE 'message_reply';
  END IF;
END $$;
