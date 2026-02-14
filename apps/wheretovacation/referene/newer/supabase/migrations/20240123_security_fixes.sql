-- =============================================
-- SECURITY FIXES FOR CRITICAL VULNERABILITIES
-- =============================================
-- Created: 2024-01-23
-- Purpose: Fix SECURITY DEFINER functions and RLS policies

-- ISSUE 1: Restrict SECURITY DEFINER functions to admin users only
-- The get_avatar_analytics() and detect_suspicious_purchases() functions
-- were accessible to all authenticated users, which is a security risk.

-- Revoke previous permissions
REVOKE EXECUTE ON FUNCTION get_avatar_analytics() FROM authenticated;
REVOKE EXECUTE ON FUNCTION detect_suspicious_purchases() FROM authenticated;

-- Grant only to admin users
GRANT EXECUTE ON FUNCTION get_avatar_analytics() TO postgres;
GRANT EXECUTE ON FUNCTION detect_suspicious_purchases() TO postgres;

-- Create admin-only wrapper functions with proper security checks
CREATE OR REPLACE FUNCTION admin_get_avatar_analytics()
RETURNS JSON AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN get_avatar_analytics();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_detect_suspicious_purchases()
RETURNS TABLE (
  user_id UUID,
  purchase_count BIGINT,
  total_spent INTEGER,
  last_purchase TIMESTAMPTZ,
  risk_score INTEGER
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY SELECT * FROM detect_suspicious_purchases();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (they'll be checked inside the function)
GRANT EXECUTE ON FUNCTION admin_get_avatar_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_detect_suspicious_purchases() TO authenticated;

-- ISSUE 2: Fix overly permissive RLS policies
-- The "Users can view all profiles" policy is too broad

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Create more restrictive profile viewing policies
CREATE POLICY "Users can view public profile information"
  ON profiles FOR SELECT USING (
    -- Users can always view their own profile
    auth.uid() = id OR
    -- Captains can view profiles of users who booked with them
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN charters c ON b.charter_id = c.id
      JOIN captains cap ON c.captain_id = cap.id
      WHERE b.user_id = profiles.id AND cap.user_id = auth.uid()
    ) OR
    -- Users can view captains' public profiles
    EXISTS (
      SELECT 1 FROM captains cap
      WHERE cap.user_id = profiles.id AND cap.status = 'approved'
    )
  );

-- ISSUE 3: Add missing RLS policies for sensitive tables
-- Ensure avatar_purchase_log has proper restrictions

ALTER TABLE avatar_purchase_log ENABLE ROW LEVEL SECURITY;

-- Policies for avatar purchase log
CREATE POLICY "Users can view own purchase log"
  ON avatar_purchase_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchase logs"
  ON avatar_purchase_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ISSUE 4: Secure the user_biometric_devices view
-- The view should only show user's own devices

-- Drop and recreate with proper security
DROP VIEW IF EXISTS user_biometric_devices;

CREATE OR REPLACE VIEW user_biometric_devices AS
SELECT 
  wc.id,
  wc.user_id,
  wc.credential_id,
  wc.device_name,
  wc.device_type,
  wc.created_at,
  wc.last_used_at,
  COUNT(bal.id) as total_uses
FROM webauthn_credentials wc
LEFT JOIN biometric_auth_logs bal ON bal.credential_id = wc.credential_id AND bal.success = TRUE
GROUP BY wc.id, wc.user_id, wc.credential_id, wc.device_name, wc.device_type, wc.created_at, wc.last_used_at;

-- Create RLS for the view
ALTER TABLE user_biometric_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own biometric devices"
  ON user_biometric_devices FOR SELECT USING (auth.uid() = user_id);

-- ISSUE 5: Add audit logging for admin function access
CREATE TABLE IF NOT EXISTS admin_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

ALTER TABLE admin_access_logs ENABLE ROW LEVEL SECURITY;

-- Policies for admin access logs
CREATE POLICY "Admins can view all access logs"
  ON admin_access_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Users can view own access logs"
  ON admin_access_logs FOR SELECT USING (auth.uid() = user_id);

-- ISSUE 6: Update admin functions to log access
CREATE OR REPLACE FUNCTION admin_get_avatar_analytics()
RETURNS JSON AS $$
BEGIN
  -- Log admin access
  INSERT INTO admin_access_logs (user_id, function_name, ip_address, user_agent)
  VALUES (auth.uid(), 'admin_get_avatar_analytics', inet_client_addr(), current_setting('request.headers')::json->>'user-agent');
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN get_avatar_analytics();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_detect_suspicious_purchases()
RETURNS TABLE (
  user_id UUID,
  purchase_count BIGINT,
  total_spent INTEGER,
  last_purchase TIMESTAMPTZ,
  risk_score INTEGER
) AS $$
BEGIN
  -- Log admin access
  INSERT INTO admin_access_logs (user_id, function_name, ip_address, user_agent)
  VALUES (auth.uid(), 'admin_detect_suspicious_purchases', inet_client_addr(), current_setting('request.headers')::json->>'user-agent');
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY SELECT * FROM detect_suspicious_purchases();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON admin_access_logs TO authenticated;

-- Comments for documentation
COMMENT ON TABLE admin_access_logs IS 'Audit log for admin function access';
COMMENT ON FUNCTION admin_get_avatar_analytics() IS 'Admin-only function to get avatar analytics with access logging';
COMMENT ON FUNCTION admin_detect_suspicious_purchases() IS 'Admin-only function to detect suspicious purchases with access logging';
