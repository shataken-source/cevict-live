-- Switchback TV device license table
-- Each row = one authorized device. App checks this on every boot.
-- To authorize a new device: INSERT INTO switchback_devices (device_id, label) VALUES ('abc123hex', 'Joes Fire Stick');
-- To revoke: UPDATE switchback_devices SET status = 'revoked' WHERE device_id = 'abc123hex';

CREATE TABLE IF NOT EXISTS switchback_devices (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id     TEXT NOT NULL UNIQUE,       -- ANDROID_ID (64-bit hex string)
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'trial')),
  label         TEXT,                        -- friendly name e.g. "Joe's Fire Stick"
  first_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address    TEXT,                        -- last known IP (for debugging)
  app_version   TEXT,                        -- last known app version
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the lookup query
CREATE INDEX IF NOT EXISTS idx_switchback_devices_device_id ON switchback_devices (device_id);

-- RLS: only service role can read/write (app uses anon key + function)
ALTER TABLE switchback_devices ENABLE ROW LEVEL SECURITY;

-- Public function the app calls (anon key safe — only returns status, never exposes other devices)
CREATE OR REPLACE FUNCTION check_switchback_device(p_device_id TEXT, p_ip TEXT DEFAULT NULL, p_version TEXT DEFAULT NULL)
RETURNS TABLE (status TEXT, label TEXT) AS $$
BEGIN
  -- Update last_seen + metadata
  UPDATE switchback_devices d
  SET last_seen = NOW(),
      ip_address = COALESCE(p_ip, d.ip_address),
      app_version = COALESCE(p_version, d.app_version)
  WHERE d.device_id = p_device_id;

  -- Return status
  RETURN QUERY
    SELECT d.status, d.label
    FROM switchback_devices d
    WHERE d.device_id = p_device_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
