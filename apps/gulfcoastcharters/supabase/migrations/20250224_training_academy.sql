-- Captain Training Academy
-- Courses, modules, lessons, quizzes, progress tracking, certifications

-- Course catalog
CREATE TABLE IF NOT EXISTS training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,               -- 'safety-101'
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,                  -- 'safety', 'customer_service', 'marine_biology', 'business'
  difficulty TEXT DEFAULT 'beginner',      -- 'beginner', 'intermediate', 'advanced'
  duration_minutes INTEGER DEFAULT 0,
  badge_icon TEXT,                          -- emoji or icon name
  badge_color TEXT,                         -- hex color
  thumbnail_url TEXT,
  is_required BOOLEAN DEFAULT false,       -- mandatory for captain onboarding
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modules within a course
CREATE TABLE IF NOT EXISTS training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons within a module
CREATE TABLE IF NOT EXISTS training_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT DEFAULT 'video',       -- 'video', 'text', 'interactive'
  video_url TEXT,
  text_content TEXT,
  duration_minutes INTEGER DEFAULT 10,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz questions per lesson
CREATE TABLE IF NOT EXISTS training_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',     -- ["Option A", "Option B", "Option C", "Option D"]
  correct_index INTEGER NOT NULL,          -- 0-based index into options
  explanation TEXT,                         -- shown after answering
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Captain progress tracking
CREATE TABLE IF NOT EXISTS training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id UUID NOT NULL,                -- auth user id
  lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  quiz_score INTEGER,                      -- 0-100
  quiz_passed BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(captain_id, lesson_id)
);

-- Course certifications (awarded on 100% completion)
CREATE TABLE IF NOT EXISTS training_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  certificate_number TEXT UNIQUE NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                  -- optional expiration for recertification
  pdf_url TEXT,                            -- generated PDF certificate
  UNIQUE(captain_id, course_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_modules_course ON training_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_training_lessons_module ON training_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_training_quiz_lesson ON training_quiz_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_captain ON training_progress(captain_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_lesson ON training_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_training_certs_captain ON training_certifications(captain_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA: 4 courses with modules, lessons, and quiz questions
-- ═══════════════════════════════════════════════════════════════════════════

-- Course 1: Maritime Safety Fundamentals
INSERT INTO training_courses (slug, title, description, category, difficulty, duration_minutes, badge_icon, badge_color, is_required, display_order)
VALUES ('safety-101', 'Maritime Safety Fundamentals', 'Essential safety protocols every charter captain must know. Covers emergency procedures, weather safety, and first aid at sea.', 'safety', 'beginner', 180, '🛟', '#EF4444', true, 1)
ON CONFLICT (slug) DO NOTHING;

-- Course 2: Customer Service Excellence
INSERT INTO training_courses (slug, title, description, category, difficulty, duration_minutes, badge_icon, badge_color, display_order)
VALUES ('service-101', 'Excellence in Customer Service', 'Master the art of creating unforgettable charter experiences. Learn guest communication, conflict resolution, and how to earn 5-star reviews.', 'customer_service', 'beginner', 120, '⭐', '#3B82F6', 2)
ON CONFLICT (slug) DO NOTHING;

-- Course 3: Marine Biology Essentials
INSERT INTO training_courses (slug, title, description, category, difficulty, duration_minutes, badge_icon, badge_color, display_order)
VALUES ('marine-bio-101', 'Marine Biology Essentials', 'Understand Gulf Coast marine ecosystems, fish species identification, and conservation practices to enhance the charter experience.', 'marine_biology', 'intermediate', 240, '🐠', '#10B981', 3)
ON CONFLICT (slug) DO NOTHING;

-- Course 4: Charter Business Management
INSERT INTO training_courses (slug, title, description, category, difficulty, duration_minutes, badge_icon, badge_color, display_order)
VALUES ('business-101', 'Charter Business Management', 'Grow your charter business with proven marketing strategies, financial management, and operational best practices.', 'business', 'intermediate', 200, '💼', '#8B5CF6', 4)
ON CONFLICT (slug) DO NOTHING;

-- Modules & lessons for Safety-101
DO $$
DECLARE
  v_course_id UUID;
  v_mod1_id UUID;
  v_mod2_id UUID;
  v_mod3_id UUID;
  v_lesson_id UUID;
BEGIN
  SELECT id INTO v_course_id FROM training_courses WHERE slug = 'safety-101';
  IF v_course_id IS NULL THEN RETURN; END IF;

  -- Module 1: Emergency Procedures
  INSERT INTO training_modules (course_id, title, description, display_order)
  VALUES (v_course_id, 'Emergency Procedures', 'How to handle emergencies at sea', 1)
  RETURNING id INTO v_mod1_id;

  INSERT INTO training_lessons (module_id, title, content_type, text_content, duration_minutes, display_order)
  VALUES (v_mod1_id, 'Man Overboard Protocol', 'text', 'The MOB procedure is the most critical skill for any captain. This lesson covers the immediate actions: shout "Man Overboard!", throw flotation, assign a spotter, execute the Williamson Turn, and recovery techniques.', 15, 1)
  RETURNING id INTO v_lesson_id;

  INSERT INTO training_quiz_questions (lesson_id, question, options, correct_index, explanation, display_order) VALUES
  (v_lesson_id, 'What is the FIRST thing you should do when someone falls overboard?', '["Jump in after them", "Shout Man Overboard and throw flotation", "Call the Coast Guard", "Turn the boat around"]', 1, 'The immediate priority is alerting the crew and getting flotation to the person in the water.', 1),
  (v_lesson_id, 'What maneuver is used to return to a MOB position?', '["Figure-8 turn", "Williamson Turn", "Anderson Turn", "U-turn"]', 1, 'The Williamson Turn brings the vessel back along its original track to the point where the person went overboard.', 2),
  (v_lesson_id, 'Who should be assigned during a MOB situation?', '["A dedicated spotter who never loses sight of the person", "Everyone should look", "Only the captain watches", "The first mate steers"]', 0, 'A dedicated spotter should point at and maintain visual contact with the person at all times.', 3);

  INSERT INTO training_lessons (module_id, title, content_type, text_content, duration_minutes, display_order)
  VALUES (v_mod1_id, 'Fire Suppression at Sea', 'text', 'Marine fires require immediate action. This lesson covers fire types (Class A, B, C), proper extinguisher use (PASS method: Pull, Aim, Squeeze, Sweep), engine room fires, and electrical fire protocols.', 15, 2)
  RETURNING id INTO v_lesson_id;

  INSERT INTO training_quiz_questions (lesson_id, question, options, correct_index, explanation, display_order) VALUES
  (v_lesson_id, 'What does PASS stand for in fire extinguisher use?', '["Push, Aim, Spray, Stop", "Pull, Aim, Squeeze, Sweep", "Point, Activate, Spray, Secure", "Pull, Activate, Spray, Stop"]', 1, 'PASS: Pull the pin, Aim at the base of the fire, Squeeze the handle, Sweep side to side.', 1),
  (v_lesson_id, 'What type of fire involves flammable liquids like fuel?', '["Class A", "Class B", "Class C", "Class D"]', 1, 'Class B fires involve flammable liquids. Class A = ordinary combustibles, Class C = electrical.', 2),
  (v_lesson_id, 'What should you do FIRST if you discover an engine room fire?', '["Open the engine compartment to assess", "Shut off fuel supply and ventilation", "Use water to extinguish", "Abandon ship"]', 1, 'Cut off the fuel and air supply first. Never open the compartment as oxygen feeds the fire.', 3);

  INSERT INTO training_lessons (module_id, title, content_type, text_content, duration_minutes, display_order)
  VALUES (v_mod1_id, 'Distress Signals & Mayday Procedures', 'text', 'Learn the proper format for Mayday calls on VHF Channel 16, DSC distress alerts, visual distress signals (flares, flags, lights), and when to use Pan-Pan vs. Mayday vs. Securite.', 15, 3)
  RETURNING id INTO v_lesson_id;

  INSERT INTO training_quiz_questions (lesson_id, question, options, correct_index, explanation, display_order) VALUES
  (v_lesson_id, 'Which VHF channel is the international distress frequency?', '["Channel 9", "Channel 13", "Channel 16", "Channel 22"]', 2, 'Channel 16 (156.8 MHz) is monitored by the Coast Guard and all vessels.', 1),
  (v_lesson_id, 'When should you use "Pan-Pan" instead of "Mayday"?', '["When the situation is urgent but not life-threatening", "When you need directions", "When you want a radio check", "Never — always use Mayday"]', 0, 'Pan-Pan indicates urgency without immediate danger to life. Mayday is reserved for grave and imminent danger.', 2),
  (v_lesson_id, 'How many times should you say "Mayday" at the start of a distress call?', '["Once", "Twice", "Three times", "As many as needed"]', 2, 'The correct format begins: "Mayday, Mayday, Mayday, this is [vessel name] three times."', 3);

  -- Module 2: Weather Safety
  INSERT INTO training_modules (course_id, title, description, display_order)
  VALUES (v_course_id, 'Weather Safety', 'Reading conditions and making safe decisions', 2)
  RETURNING id INTO v_mod2_id;

  INSERT INTO training_lessons (module_id, title, content_type, text_content, duration_minutes, display_order)
  VALUES (v_mod2_id, 'Reading Marine Weather Forecasts', 'text', 'Understanding NOAA marine forecasts, wind speed scales (Beaufort), wave height predictions, small craft advisories, and how to use barometric pressure trends to predict changing conditions.', 20, 1)
  RETURNING id INTO v_lesson_id;

  INSERT INTO training_quiz_questions (lesson_id, question, options, correct_index, explanation, display_order) VALUES
  (v_lesson_id, 'What does a Small Craft Advisory indicate?', '["Winds 15-20 knots or waves 4+ feet expected", "Winds 25-33 knots and/or seas 7+ feet expected", "A hurricane is approaching", "Only sailboats should stay in port"]', 1, 'SCA is issued for sustained winds 25-33 knots and/or hazardous wave conditions.', 1),
  (v_lesson_id, 'Rapidly falling barometric pressure usually indicates:', '["Clear weather ahead", "Approaching storm system", "Fog formation", "Light winds"]', 1, 'A rapid pressure drop (>0.06 inHg/hr) indicates an approaching storm with potentially strong winds.', 2),
  (v_lesson_id, 'Where can captains get the latest marine forecast?', '["NOAA Weather Radio, VHF WX channels, and weather.gov", "Only by calling the marina", "Social media only", "The newspaper"]', 0, 'NOAA provides marine forecasts via Weather Radio, VHF weather channels (WX1-WX7), and weather.gov.', 3);

  INSERT INTO training_lessons (module_id, title, content_type, text_content, duration_minutes, display_order)
  VALUES (v_mod2_id, 'Lightning & Thunderstorm Safety', 'text', 'Gulf Coast thunderstorms can develop rapidly. This lesson covers lightning risk assessment, safe harbor procedures, passenger safety positioning, and the 30/30 rule for lightning distance.', 15, 2)
  RETURNING id INTO v_lesson_id;

  INSERT INTO training_quiz_questions (lesson_id, question, options, correct_index, explanation, display_order) VALUES
  (v_lesson_id, 'What is the 30/30 rule for lightning safety?', '["Seek shelter if flash-to-bang is 30 seconds; wait 30 minutes after last strike", "Stay 30 miles from shore for 30 minutes", "30 knot winds for 30 seconds", "None of these"]', 0, 'If you count less than 30 seconds between lightning and thunder, seek shelter. Wait 30 minutes after the last strike.', 1);

  -- Module 3: First Aid at Sea
  INSERT INTO training_modules (course_id, title, description, display_order)
  VALUES (v_course_id, 'First Aid at Sea', 'Essential medical response for charter captains', 3)
  RETURNING id INTO v_mod3_id;

  INSERT INTO training_lessons (module_id, title, content_type, text_content, duration_minutes, display_order)
  VALUES (v_mod3_id, 'Marine First Aid Kit Essentials', 'text', 'Required first aid supplies for charter vessels, how to maintain your kit, expiration tracking, and Coast Guard requirements for different vessel classes.', 10, 1)
  RETURNING id INTO v_lesson_id;

  INSERT INTO training_quiz_questions (lesson_id, question, options, correct_index, explanation, display_order) VALUES
  (v_lesson_id, 'Which of the following is NOT typically required in a marine first aid kit?', '["Seasickness medication", "Tourniquet", "Defibrillator", "Bandages and gauze"]', 2, 'While AEDs are recommended for larger vessels, they are not a standard requirement for charter first aid kits.', 1);

  INSERT INTO training_lessons (module_id, title, content_type, text_content, duration_minutes, display_order)
  VALUES (v_mod3_id, 'Heat Exhaustion & Dehydration', 'text', 'Recognize and treat heat-related illnesses common on Gulf Coast charters: heat exhaustion symptoms, heat stroke emergency response, prevention through hydration, shade, and sun protection.', 15, 2)
  RETURNING id INTO v_lesson_id;

  INSERT INTO training_quiz_questions (lesson_id, question, options, correct_index, explanation, display_order) VALUES
  (v_lesson_id, 'What is the key difference between heat exhaustion and heat stroke?', '["Heat stroke involves core temp above 104°F and altered mental state", "They are the same thing", "Heat exhaustion is worse", "Heat stroke only happens indoors"]', 0, 'Heat stroke is a medical emergency with body temp >104°F and confusion/unconsciousness. Heat exhaustion has lower temp with heavy sweating.', 1);

END $$;
