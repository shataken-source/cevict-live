-- Migration 002: Trip Albums
CREATE TABLE IF NOT EXISTS trip_albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  captain_id UUID REFERENCES captains(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  photo_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID REFERENCES trip_albums(id) ON DELETE CASCADE,
  thumbnail_url TEXT NOT NULL,
  medium_url TEXT NOT NULL,
  full_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_albums_trip ON trip_albums(trip_id);
CREATE INDEX idx_photos_album ON trip_photos(album_id);
