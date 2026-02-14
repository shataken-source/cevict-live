-- =============================================
-- WEATHER ALERTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS weather_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES multi_day_trips(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'extreme')),
  event TEXT NOT NULL,
  headline TEXT,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE weather_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view own alerts" ON weather_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own alerts" ON weather_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own alerts" ON weather_alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own alerts" ON weather_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_weather_alerts_user ON weather_alerts(user_id);
CREATE INDEX idx_weather_alerts_trip ON weather_alerts(trip_id);
CREATE INDEX idx_weather_alerts_time ON weather_alerts(start_time, end_time);
CREATE INDEX idx_weather_alerts_severity ON weather_alerts(severity);
