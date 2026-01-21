-- Default Settings for PopThePopcorn
-- Run this after creating the app_settings table to populate default values

-- Trending Topics Settings
INSERT INTO app_settings (key, value, description, category) VALUES
  ('TWITTER_TRENDS_LOCATION', 'worldwide', 'Location for Twitter/X trending topics. Options: worldwide, usa, uk, canada, australia', 'trending')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, description, category) VALUES
  ('GOOGLE_TRENDS_LOCATION', 'US', 'Location for Google Trends. Options: US, GB, CA, AU, DE, FR, ES, IT, JP, IN, BR, etc.', 'trending')
ON CONFLICT (key) DO NOTHING;

-- Scraper Settings
INSERT INTO app_settings (key, value, description, category) VALUES
  ('SCRAPER_ITEMS_PER_SOURCE', '20', 'Number of items to scrape per news source (1-100)', 'scraper')
ON CONFLICT (key) DO NOTHING;

-- Display Settings
INSERT INTO app_settings (key, value, description, category) VALUES
  ('HEADLINES_PER_CATEGORY', '10', 'Number of headlines to display per category on homepage (1-50)', 'display')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, description, category) VALUES
  ('AUTO_REFRESH_INTERVAL', '60', 'Auto-refresh interval in seconds for homepage (10-300)', 'display')
ON CONFLICT (key) DO NOTHING;
