-- ============================================
-- GUARDIAN PULSE - Supabase Schema
-- ============================================
-- Dead Man's Switch for Cevict
-- Run this in your Supabase SQL Editor

-- System Configuration Table
CREATE TABLE IF NOT EXISTS system_config (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guardian Pulse Event Log
CREATE TABLE IF NOT EXISTS guardian_pulse_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    batch_id VARCHAR(100),
    message TEXT,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_guardian_log_event ON guardian_pulse_log(event_type);
CREATE INDEX IF NOT EXISTS idx_guardian_log_timestamp ON guardian_pulse_log(timestamp DESC);

-- Insert default configuration
INSERT INTO system_config (config_key, value) VALUES
    ('guardian_last_checkin', NOW()::TEXT),
    ('guardian_handover_status', 'active'),
    ('guardian_timeout_hours', '24'),
    ('anai_active', 'false')
ON CONFLICT (config_key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_pulse_log ENABLE ROW LEVEL SECURITY;

-- Policies for service role access
CREATE POLICY "Service role full access to system_config" ON system_config
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to guardian_pulse_log" ON guardian_pulse_log
    FOR ALL USING (auth.role() = 'service_role');

-- Anon key can read system_config
CREATE POLICY "Anon read system_config" ON system_config
    FOR SELECT USING (true);

-- ============================================
-- Functions for Guardian Pulse
-- ============================================

-- Function to check if handover should trigger
CREATE OR REPLACE FUNCTION check_guardian_handover()
RETURNS JSONB AS $$
DECLARE
    last_checkin TIMESTAMPTZ;
    timeout_hours INTEGER;
    hours_since_checkin NUMERIC;
    should_trigger BOOLEAN;
    current_status VARCHAR;
BEGIN
    -- Get last check-in
    SELECT value::TIMESTAMPTZ INTO last_checkin
    FROM system_config
    WHERE config_key = 'guardian_last_checkin';
    
    -- Get timeout
    SELECT value::INTEGER INTO timeout_hours
    FROM system_config
    WHERE config_key = 'guardian_timeout_hours';
    
    -- Default values
    last_checkin := COALESCE(last_checkin, NOW());
    timeout_hours := COALESCE(timeout_hours, 24);
    
    -- Calculate hours since check-in
    hours_since_checkin := EXTRACT(EPOCH FROM (NOW() - last_checkin)) / 3600;
    
    -- Determine status
    IF hours_since_checkin >= timeout_hours THEN
        current_status := 'TRIGGERED';
        should_trigger := TRUE;
    ELSIF hours_since_checkin >= (timeout_hours / 2) THEN
        current_status := 'WARNING';
        should_trigger := FALSE;
    ELSE
        current_status := 'ACTIVE';
        should_trigger := FALSE;
    END IF;
    
    RETURN jsonb_build_object(
        'status', current_status,
        'hours_since_checkin', ROUND(hours_since_checkin::NUMERIC, 1),
        'hours_remaining', GREATEST(0, timeout_hours - ROUND(hours_since_checkin::NUMERIC, 1)),
        'timeout_hours', timeout_hours,
        'should_trigger', should_trigger,
        'last_checkin', last_checkin
    );
END;
$$ LANGUAGE plpgsql;

-- Function to reset check-in
CREATE OR REPLACE FUNCTION guardian_checkin()
RETURNS VOID AS $$
BEGIN
    INSERT INTO system_config (config_key, value, updated_at)
    VALUES ('guardian_last_checkin', NOW()::TEXT, NOW())
    ON CONFLICT (config_key) 
    DO UPDATE SET value = NOW()::TEXT, updated_at = NOW();
    
    -- Log the check-in
    INSERT INTO guardian_pulse_log (event_type, timestamp)
    VALUES ('manual_checkin', NOW());
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Scheduled Jobs (if using pg_cron)
-- ============================================

-- Example: Check handover status every hour
-- SELECT cron.schedule('guardian-check', '0 * * * *', 'SELECT check_guardian_handover()');

-- Example: Send daily heartbeat at 9 AM
-- SELECT cron.schedule('guardian-heartbeat', '0 9 * * *', 'SELECT notify_guardian_heartbeat()');

COMMENT ON TABLE system_config IS 'System-wide configuration including Guardian Pulse settings';
COMMENT ON TABLE guardian_pulse_log IS 'Log of all Guardian Pulse events (heartbeats, check-ins, handovers)';

