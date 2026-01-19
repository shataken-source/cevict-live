# Catch Logging & Social Sharing System Guide

## Overview
Complete fishing catch logging system with leaderboards, social sharing, and tournament integration.

## Features Implemented
✅ Catch logging with species, weight, location, photos
✅ Catch leaderboard by species
✅ Social sharing with custom branded images
✅ Photo upload to Supabase storage
✅ Catch verification system for tournaments
✅ Integration with existing social sharing infrastructure

## Database Setup Required

Run these SQL commands in Supabase SQL Editor:

```sql
-- Fish species table
CREATE TABLE fish_species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  scientific_name TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User catches table
CREATE TABLE user_catches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id UUID NOT NULL REFERENCES fish_species(id),
  weight DECIMAL(10,2) NOT NULL,
  length DECIMAL(10,2),
  location TEXT NOT NULL,
  catch_date TIMESTAMPTZ NOT NULL,
  photo_url TEXT,
  notes TEXT,
  is_verified BOOLEAN DEFAULT false,
  shares_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catch likes
CREATE TABLE catch_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catch_id UUID NOT NULL REFERENCES user_catches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(catch_id, user_id)
);

-- Insert sample species
INSERT INTO fish_species (name, scientific_name, category) VALUES
('Red Snapper', 'Lutjanus campechanus', 'offshore'),
('Redfish', 'Sciaenops ocellatus', 'inshore'),
('Speckled Trout', 'Cynoscion nebulosus', 'inshore'),
('King Mackerel', 'Scomberomorus cavalla', 'offshore'),
('Mahi Mahi', 'Coryphaena hippurus', 'offshore'),
('Grouper', 'Epinephelus spp.', 'offshore'),
('Tarpon', 'Megalops atlanticus', 'inshore'),
('Snook', 'Centropomus undecimalis', 'inshore');

-- Enable RLS
ALTER TABLE fish_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_catches ENABLE ROW LEVEL SECURITY;
ALTER TABLE catch_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read species" ON fish_species FOR SELECT USING (true);
CREATE POLICY "Public read catches" ON user_catches FOR SELECT USING (true);
CREATE POLICY "Users insert catches" ON user_catches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own catches" ON user_catches FOR UPDATE USING (auth.uid() = user_id);
```

## Components Created
- **CatchLogger**: Form for logging catches with photo upload
- **CatchLeaderboard**: Display top catches by species
- **SocialShareButton**: Share catches on social media (already existed)

## Edge Functions
- **catch-logger**: Backend for catch CRUD operations
- **share-image-generator**: Updated to support catch sharing with branded images

## Storage Bucket
- **catch-photos**: Public bucket for catch photos

## Usage

### Log a Catch
Click "Log Catch" button in navigation to open the modal form.

### View Leaderboard
Scroll to leaderboard section or click "Leaderboard" in nav.

### Share a Catch
Click share button on any catch in the leaderboard to share on social media.

## Social Sharing
Generates custom branded images with:
- Gulf Coast Charters branding
- Fish species and weight
- Location and date
- Angler name
- Verification badge (if verified)

All shares tracked in social_shares table for analytics.
