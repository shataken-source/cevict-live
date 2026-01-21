-- Story Arcs System (The "Lore" System)
-- Gamified context tracking for Gen Z - turns news into Netflix-like seasons/episodes

-- Story Arcs table (the "Seasons")
CREATE TABLE IF NOT EXISTS story_arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('politics', 'tech', 'entertainment', 'business', 'sports', 'lifestyle', 'social', 'viral', 'other')),
  season_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'concluded', 'archived')),
  total_episodes INTEGER DEFAULT 0,
  total_drama_score INTEGER DEFAULT 0,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_episode_at TIMESTAMP WITH TIME ZONE
);

-- Story Arc Episodes (links headlines to arcs)
CREATE TABLE IF NOT EXISTS story_arc_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_id UUID NOT NULL,
  headline_id UUID NOT NULL,
  episode_number INTEGER NOT NULL,
  title TEXT, -- Episode title (can override headline title)
  summary TEXT, -- Episode summary
  drama_score INTEGER CHECK (drama_score >= 1 AND drama_score <= 10),
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_arc FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE,
  CONSTRAINT fk_headline FOREIGN KEY (headline_id) REFERENCES headlines(id) ON DELETE CASCADE,
  UNIQUE(arc_id, headline_id)
);

-- User subscriptions to story arcs (for notifications)
CREATE TABLE IF NOT EXISTS story_arc_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_id UUID NOT NULL,
  user_identifier TEXT NOT NULL, -- IP address or user ID
  notification_preference TEXT DEFAULT 'all' CHECK (notification_preference IN ('all', 'breaking_only', 'none')),
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_arc_subscription FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE,
  UNIQUE(arc_id, user_identifier)
);

-- Indexes
CREATE INDEX idx_story_arcs_category ON story_arcs(category);
CREATE INDEX idx_story_arcs_status ON story_arcs(status);
CREATE INDEX idx_story_arcs_updated_at ON story_arcs(updated_at DESC);
CREATE INDEX idx_story_arc_episodes_arc_id ON story_arc_episodes(arc_id);
CREATE INDEX idx_story_arc_episodes_headline_id ON story_arc_episodes(headline_id);
CREATE INDEX idx_story_arc_episodes_episode_number ON story_arc_episodes(arc_id, episode_number);
CREATE INDEX idx_story_arc_subscriptions_arc_id ON story_arc_subscriptions(arc_id);
CREATE INDEX idx_story_arc_subscriptions_user ON story_arc_subscriptions(user_identifier);

-- Function to update arc stats when episode is added
CREATE OR REPLACE FUNCTION update_arc_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE story_arcs
  SET 
    total_episodes = (SELECT COUNT(*) FROM story_arc_episodes WHERE arc_id = NEW.arc_id),
    total_drama_score = (SELECT COALESCE(SUM(drama_score), 0) FROM story_arc_episodes WHERE arc_id = NEW.arc_id),
    last_episode_at = NEW.posted_at,
    updated_at = NOW()
  WHERE id = NEW.arc_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update arc stats
DROP TRIGGER IF EXISTS trigger_update_arc_stats ON story_arc_episodes;
CREATE TRIGGER trigger_update_arc_stats
  AFTER INSERT OR UPDATE ON story_arc_episodes
  FOR EACH ROW EXECUTE FUNCTION update_arc_stats();

-- RLS Policies
ALTER TABLE story_arcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_arc_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_arc_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to story arcs
CREATE POLICY "Allow public read access to story_arcs"
  ON story_arcs FOR SELECT
  USING (true);

-- Allow public read access to episodes
CREATE POLICY "Allow public read access to story_arc_episodes"
  ON story_arc_episodes FOR SELECT
  USING (true);

-- Allow public insert access to subscriptions
CREATE POLICY "Allow public insert access to story_arc_subscriptions"
  ON story_arc_subscriptions FOR INSERT
  WITH CHECK (true);

-- Allow public read access to subscriptions
CREATE POLICY "Allow public read access to story_arc_subscriptions"
  ON story_arc_subscriptions FOR SELECT
  USING (true);
