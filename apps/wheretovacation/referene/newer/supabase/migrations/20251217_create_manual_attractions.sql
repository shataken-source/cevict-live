CREATE TABLE IF NOT EXISTS manual_attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  url TEXT,
  status TEXT DEFAULT 'unknown',
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_manual_attractions_city_state ON manual_attractions(city, state);
CREATE INDEX IF NOT EXISTS idx_manual_attractions_status ON manual_attractions(status);
CREATE OR REPLACE FUNCTION update_manual_attractions_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_manual_attractions_updated_at ON manual_attractions;
CREATE TRIGGER update_manual_attractions_updated_at BEFORE
UPDATE ON manual_attractions FOR EACH ROW EXECUTE FUNCTION update_manual_attractions_updated_at();