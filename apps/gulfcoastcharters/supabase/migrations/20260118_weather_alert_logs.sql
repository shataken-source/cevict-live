-- Weather Alert Logs Table
-- Tracks all weather alerts sent to customers and captains

CREATE TABLE IF NOT EXISTS weather_alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  user_id UUID,
  captain_id UUID,
  booking_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weather_alert_logs_alert_id ON weather_alert_logs(alert_id);
CREATE INDEX IF NOT EXISTS idx_weather_alert_logs_user_id ON weather_alert_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_alert_logs_booking_id ON weather_alert_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_weather_alert_logs_sent_at ON weather_alert_logs(sent_at DESC);

-- Disable RLS for development (enable in production with proper policies)
ALTER TABLE weather_alert_logs DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE weather_alert_logs IS 'Tracks all weather alert SMS messages sent to customers and captains';
