-- =============================================
-- ENTERPRISE SECURITY AND ERROR LOGGING TABLES
-- =============================================
-- Created: 2024-01-24
-- Purpose: Support enterprise-level security monitoring and error tracking

-- Security Audit Logs Table
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip TEXT NOT NULL,
  user_agent TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'blocked')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error Logs Table
CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL CHECK (category IN (
    'validation', 'authentication', 'authorization', 'database', 
    'external_api', 'network', 'system', 'business_logic', 'security'
  )),
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error Alerts Table
CREATE TABLE IF NOT EXISTS error_alerts (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  latest_error_id TEXT REFERENCES error_logs(id),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate Limit Tracking Table (for distributed rate limiting)
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '15 minutes'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ip_address, endpoint, window_start)
);

-- Security Events Table (for security monitoring)
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  source_ip TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  endpoint TEXT,
  details JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Monitoring Table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  response_time INTEGER NOT NULL, -- in milliseconds
  status_code INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Usage Analytics Table
CREATE TABLE IF NOT EXISTS api_usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  total_requests INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  avg_response_time INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, endpoint, method)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_timestamp ON security_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip ON security_audit_logs(ip);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_action ON security_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_status ON security_audit_logs(status);

CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(category);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs((context->>'userId'));

CREATE INDEX IF NOT EXISTS idx_error_alerts_timestamp ON error_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_alerts_severity ON error_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_error_alerts_acknowledged ON error_alerts(acknowledged);

CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_ip_endpoint ON rate_limit_tracking(ip_address, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_window_end ON rate_limit_tracking(window_end);

CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_response_time ON performance_metrics(response_time);

CREATE INDEX IF NOT EXISTS idx_api_usage_analytics_date ON api_usage_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_analytics_endpoint ON api_usage_analytics(endpoint);

-- Enable Row Level Security
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_audit_logs
CREATE POLICY "Admins can view all security logs"
  ON security_audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "System can insert security logs"
  ON security_audit_logs FOR INSERT WITH CHECK (true);

-- RLS Policies for error_logs
CREATE POLICY "Admins can view all error logs"
  ON error_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "System can insert error logs"
  ON error_logs FOR INSERT WITH CHECK (true);

-- RLS Policies for error_alerts
CREATE POLICY "Admins can view all error alerts"
  ON error_alerts FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can update error alerts"
  ON error_alerts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "System can insert error alerts"
  ON error_alerts FOR INSERT WITH CHECK (true);

-- RLS Policies for security_events
CREATE POLICY "Admins can view all security events"
  ON security_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can update security events"
  ON security_events FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "System can insert security events"
  ON security_events FOR INSERT WITH CHECK (true);

-- RLS Policies for performance_metrics
CREATE POLICY "Admins can view all performance metrics"
  ON performance_metrics FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "System can insert performance metrics"
  ON performance_metrics FOR INSERT WITH CHECK (true);

-- RLS Policies for api_usage_analytics
CREATE POLICY "Admins can view all API analytics"
  ON api_usage_analytics FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "System can manage API analytics"
  ON api_usage_analytics FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Create function to clean up old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- Delete security audit logs older than 90 days
  DELETE FROM security_audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete error logs older than 30 days (except critical errors)
  DELETE FROM error_logs 
  WHERE created_at < NOW() - INTERVAL '30 days' 
  AND severity != 'critical';
  
  -- Delete resolved security events older than 60 days
  DELETE FROM security_events 
  WHERE resolved = true 
  AND resolved_at < NOW() - INTERVAL '60 days';
  
  -- Delete performance metrics older than 7 days
  DELETE FROM performance_metrics 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Delete old rate limit tracking
  DELETE FROM rate_limit_tracking 
  WHERE window_end < NOW();
  
  RAISE NOTICE 'Old logs cleanup completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to aggregate API usage analytics
CREATE OR REPLACE FUNCTION update_api_usage_analytics()
RETURNS void AS $$
BEGIN
  INSERT INTO api_usage_analytics (
    date, endpoint, method, total_requests, unique_users, 
    error_count, avg_response_time, updated_at
  )
  SELECT 
    DATE(created_at) as date,
    endpoint,
    method,
    COUNT(*) as total_requests,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
    ROUND(AVG(response_time)) as avg_response_time,
    NOW() as updated_at
  FROM performance_metrics
  WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
  GROUP BY DATE(created_at), endpoint, method
  ON CONFLICT (date, endpoint, method) 
  DO UPDATE SET
    total_requests = EXCLUDED.total_requests,
    unique_users = EXCLUDED.unique_users,
    error_count = EXCLUDED.error_count,
    avg_response_time = EXCLUDED.avg_response_time,
    updated_at = EXCLUDED.updated_at;
  
  RAISE NOTICE 'API usage analytics updated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION cleanup_old_logs() TO service_role;
GRANT EXECUTE ON FUNCTION update_api_usage_analytics() TO service_role;

-- Create automated cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-logs', '0 2 * * *', 'SELECT cleanup_old_logs();');
-- SELECT cron.schedule('update-analytics', '0 1 * * *', 'SELECT update_api_usage_analytics();');

-- Comments for documentation
COMMENT ON TABLE security_audit_logs IS 'Audit log for security events and user actions';
COMMENT ON TABLE error_logs IS 'Centralized error logging for application errors';
COMMENT ON TABLE error_alerts IS 'Alerts for error threshold violations';
COMMENT ON TABLE rate_limit_tracking IS 'Distributed rate limiting tracking';
COMMENT ON TABLE security_events IS 'Security monitoring events';
COMMENT ON TABLE performance_metrics IS 'Application performance monitoring';
COMMENT ON TABLE api_usage_analytics IS 'API usage analytics and metrics';

COMMENT ON FUNCTION cleanup_old_logs() IS 'Automated cleanup of old log entries';
COMMENT ON FUNCTION update_api_usage_analytics() IS 'Daily aggregation of API usage metrics';
