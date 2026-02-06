-- Link Click Tracking - Database Functions
-- Helper functions for tracking shortened link clicks

-- Function to increment link click count
CREATE OR REPLACE FUNCTION public.increment_link_clicks(p_link_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.shortened_links
  SET 
    click_count = click_count + 1,
    unique_clicks = unique_clicks + 1
  WHERE id = p_link_id;
END;
$$;

-- Function to increment SMS campaign rate limit
CREATE OR REPLACE FUNCTION public.increment_sms_rate_limit(
  p_user_id UUID,
  p_phone_number TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sms_rate_limits
  SET 
    messages_sent = messages_sent + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id 
    AND phone_number = p_phone_number;
END;
$$;
