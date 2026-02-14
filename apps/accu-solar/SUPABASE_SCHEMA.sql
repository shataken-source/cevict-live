-- ============================================================================
-- ACCU SOLAR COMMAND - SUPABASE SCHEMA
-- ============================================================================

-- Scenarios: User-created "what-if" configurations
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  site_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- System configurations
  base_config JSONB NOT NULL,  -- Current system (panels, battery, inverter, etc)
  proposed_config JSONB NOT NULL,  -- Modified system
  
  -- Calculated results
  results JSONB NOT NULL,  -- {annual_kwh, roi_years, payback_usd, grid_independence_pct, etc}
  
  -- Timestamp tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT scenarios_user_site_fk FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX idx_scenarios_user_site ON scenarios(user_id, site_id);

-- Historical Telemetry: Production data for trending (30 days Basic, 90 days Pro)
CREATE TABLE IF NOT EXISTS telemetry_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  site_id UUID NOT NULL,
  
  -- Timestamp
  measurement_time TIMESTAMP NOT NULL,
  
  -- Power metrics
  solar_w NUMERIC,
  load_w NUMERIC,
  grid_w NUMERIC,
  battery_soc_pct NUMERIC,
  battery_v NUMERIC,
  battery_a NUMERIC,
  battery_temp_c NUMERIC,
  
  -- Efficiency & performance
  efficiency_pct NUMERIC,
  self_consumption_pct NUMERIC,
  grid_export_w NUMERIC,
  
  -- Environmental
  cloud_cover_pct NUMERIC,
  temperature_c NUMERIC,
  irradiance_w_m2 NUMERIC,
  
  -- Metadata
  tier TEXT DEFAULT 'basic',  -- 'basic' or 'pro' (determines retention)
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT telemetry_history_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX idx_telemetry_user_site_time ON telemetry_history(user_id, site_id, measurement_time DESC);
CREATE INDEX idx_telemetry_created ON telemetry_history(created_at);

-- AI Recommendations: Auto-generated system improvement suggestions
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  site_id UUID NOT NULL,
  
  -- Recommendation details
  type TEXT NOT NULL,  -- 'panel_upgrade', 'battery_upgrade', 'microinverter', 'wiring_optimization', etc
  title TEXT NOT NULL,
  description TEXT,
  
  -- Financial impact
  estimated_cost NUMERIC,
  annual_savings NUMERIC,
  payback_years NUMERIC,
  twenty_year_roi NUMERIC,
  
  -- Confidence & ranking
  confidence_score NUMERIC,  -- 0-100 (how confident the AI is)
  priority INTEGER,  -- 1 (highest) to 5 (lowest)
  
  -- Implementation
  action_url TEXT,  -- Link to scenario builder with this recommendation
  dismissed_at TIMESTAMP,  -- NULL if active, timestamp if user dismissed
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT recommendations_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX idx_recommendations_user_site ON recommendations(user_id, site_id);
CREATE INDEX idx_recommendations_active ON recommendations(user_id, dismissed_at) WHERE dismissed_at IS NULL;

-- System Configurations: Save complete system setups
CREATE TABLE IF NOT EXISTS system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  site_id UUID NOT NULL,
  
  -- Panel array
  panel_model TEXT,
  panel_wattage NUMERIC,
  panel_count INTEGER,
  panel_voc_v NUMERIC,  -- Open circuit voltage (for cold-weather warning)
  panel_vmp_v NUMERIC,  -- Max power voltage
  
  -- Wiring
  series_strings INTEGER,
  parallel_panels INTEGER,
  
  -- Battery
  battery_chemistry TEXT,  -- 'LiFePO4', 'AGM', 'Lead-acid'
  battery_voltage_v NUMERIC,
  battery_capacity_ah NUMERIC,
  battery_count INTEGER,
  
  -- Charge controller
  controller_type TEXT,  -- 'MPPT', 'PWM'
  controller_max_voc NUMERIC,  -- Max input voltage (for cold-weather warning)
  controller_max_a NUMERIC,
  
  -- Inverter
  inverter_model TEXT,
  inverter_power_w NUMERIC,
  
  -- Location & mounting
  latitude NUMERIC,
  longitude NUMERIC,
  tilt_angle NUMERIC,  -- Degrees from horizontal
  azimuth NUMERIC,  -- 0=N, 90=E, 180=S, 270=W
  mount_type TEXT,  -- 'roof_fixed', 'ground_fixed', 'adjustable', 'tracking'
  
  -- Shading profile
  shading_morning_loss_pct NUMERIC,
  shading_midday_loss_pct NUMERIC,
  shading_afternoon_loss_pct NUMERIC,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT system_configs_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX idx_system_configs_user_site ON system_configs(user_id, site_id);

-- Cold-Weather Voltage Warnings
CREATE TABLE IF NOT EXISTS voltage_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  site_id UUID NOT NULL,
  scenario_id UUID,
  
  warning_type TEXT NOT NULL,  -- 'cold_weather_voc_high', 'summer_voc_safe', etc
  title TEXT,
  message TEXT,
  current_voc NUMERIC,
  max_voc_allowed NUMERIC,
  temperature_c NUMERIC,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT voltage_warnings_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT voltage_warnings_scenario_fk FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
);

-- PDF Reports: Track generated reports
CREATE TABLE IF NOT EXISTS pdf_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  site_id UUID NOT NULL,
  scenario_id UUID,
  
  report_type TEXT,  -- 'current_system', 'scenario_comparison', 'annual_report'
  file_name TEXT,
  file_url TEXT,  -- Supabase storage URL or pre-signed URL
  
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,  -- For temporary URLs
  
  CONSTRAINT pdf_reports_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT pdf_reports_scenario_fk FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
);

-- Row-level security policies (basic)
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users see own scenarios" ON scenarios FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users see own telemetry" ON telemetry_history FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users see own recommendations" ON recommendations FOR SELECT USING (auth.uid()::text = user_id);
