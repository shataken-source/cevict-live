-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- PROFILES TABLE POLICIES
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- CAPTAINS TABLE POLICIES
CREATE POLICY "Anyone can view approved captains"
  ON captains FOR SELECT USING (status = 'approved');

CREATE POLICY "Captains can update own profile"
  ON captains FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all captains"
  ON captains FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- CHARTERS TABLE POLICIES
CREATE POLICY "Anyone can view active charters"
  ON charters FOR SELECT USING (status = 'active');

CREATE POLICY "Captains can manage own charters"
  ON charters FOR ALL USING (
    EXISTS (SELECT 1 FROM captains WHERE captains.user_id = auth.uid() AND captains.id = charters.captain_id)
  );

-- BOOKINGS TABLE POLICIES
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Captains can view their charter bookings"
  ON bookings FOR SELECT USING (
    EXISTS (SELECT 1 FROM charters JOIN captains ON captains.id = charters.captain_id 
    WHERE charters.id = bookings.charter_id AND captains.user_id = auth.uid())
  );

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- REVIEWS TABLE POLICIES
CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2FA & AUTH POLICIES
CREATE POLICY "Users manage own 2FA"
  ON user_2fa FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own backup codes"
  ON user_2fa_backup_codes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own credentials"
  ON webauthn_credentials FOR ALL USING (auth.uid() = user_id);

-- AVATAR POLICIES
CREATE POLICY "View all shop items"
  ON avatar_shop_items FOR SELECT USING (true);

CREATE POLICY "Manage own avatar"
  ON user_avatars FOR ALL USING (auth.uid() = user_id);

-- EMAIL POLICIES
CREATE POLICY "Manage own emails"
  ON custom_emails FOR ALL USING (auth.uid() = user_id);

-- MARKETPLACE POLICIES
CREATE POLICY "View active listings"
  ON marketplace_listings FOR SELECT USING (status = 'active');

CREATE POLICY "Manage own listings"
  ON marketplace_listings FOR ALL USING (auth.uid() = seller_id);


-- WEATHER ALERTS POLICIES
CREATE POLICY "Users view own weather alerts"
  ON weather_alerts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage own weather alerts"
  ON weather_alerts FOR ALL USING (auth.uid() = user_id);

-- MULTI-DAY TRIP POLICIES
CREATE POLICY "Users view own trips"
  ON multi_day_trips FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own trips"
  ON multi_day_trips FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own trips"
  ON multi_day_trips FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own trips"
  ON multi_day_trips FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "View shared trips"
  ON multi_day_trips FOR SELECT USING (share_token IS NOT NULL);

-- TRIP ACCOMMODATIONS POLICIES
CREATE POLICY "View accommodations for own trips"
  ON trip_accommodations FOR SELECT USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

CREATE POLICY "Manage accommodations for own trips"
  ON trip_accommodations FOR ALL USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

-- TRIP FISHING SPOTS POLICIES
CREATE POLICY "View spots for own trips"
  ON trip_fishing_spots FOR SELECT USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

CREATE POLICY "Manage spots for own trips"
  ON trip_fishing_spots FOR ALL USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

-- TRIP PACKING LISTS POLICIES
CREATE POLICY "View packing for own trips"
  ON trip_packing_lists FOR SELECT USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

CREATE POLICY "Manage packing for own trips"
  ON trip_packing_lists FOR ALL USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

-- TRIP COMPANIONS POLICIES
CREATE POLICY "View companions for own trips"
  ON trip_companions FOR SELECT USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

CREATE POLICY "Manage companions for own trips"
  ON trip_companions FOR ALL USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

-- TRIP ITINERARY POLICIES
CREATE POLICY "View itinerary for own trips"
  ON trip_itinerary_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

CREATE POLICY "Manage itinerary for own trips"
  ON trip_itinerary_items FOR ALL USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );
