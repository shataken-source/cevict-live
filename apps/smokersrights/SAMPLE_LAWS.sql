-- Sample Laws for Testing
-- Run this in Supabase SQL Editor to populate the laws table with sample data

INSERT INTO public.laws (state_code, state_name, category, summary, full_text, effective_date, source_url, last_updated_at)
VALUES
  -- Alabama
  ('AL', 'Alabama', 'indoor-smoking', 
   'Smoking is prohibited in all enclosed public places and workplaces, including restaurants and bars.',
   'The Alabama Clean Indoor Air Act prohibits smoking in all enclosed public places and workplaces, including restaurants, bars, and private clubs. Violations may result in fines.',
   '2003-01-01', 
   'https://www.alabamapublichealth.gov/tobacco/clean-indoor-air.html',
   NOW()),
  
  ('AL', 'Alabama', 'vaping',
   'E-cigarettes are subject to the same restrictions as traditional cigarettes in public places.',
   'Electronic smoking devices are included in the definition of smoking and are prohibited in the same locations as traditional cigarettes.',
   '2015-01-01',
   'https://www.alabamapublichealth.gov/tobacco/',
   NOW()),

  -- California
  ('CA', 'California', 'indoor-smoking',
   'Comprehensive smoking ban in all enclosed workplaces and public places, including bars and restaurants.',
   'California has one of the most comprehensive smoking bans in the nation, prohibiting smoking in all enclosed workplaces, bars, restaurants, and most public places.',
   '1995-01-01',
   'https://www.cdph.ca.gov/Programs/CCDPHP/DCDIC/CTCB/Pages/CaliforniaSmokingLaws.aspx',
   NOW()),

  ('CA', 'California', 'cannabis',
   'Recreational cannabis is legal for adults 21 and over, with restrictions on public use.',
   'Adults 21 and over may possess and use cannabis, but smoking is prohibited in public places, near schools, and while driving.',
   '2016-11-08',
   'https://cannabis.ca.gov/',
   NOW()),

  -- New York
  ('NY', 'New York', 'indoor-smoking',
   'Smoking is banned in all bars, restaurants, and workplaces, including private clubs.',
   'The New York Clean Indoor Air Act prohibits smoking in all enclosed workplaces, bars, restaurants, and private clubs.',
   '2003-07-24',
   'https://www.health.ny.gov/prevention/tobacco_control/',
   NOW()),

  ('NY', 'New York', 'outdoor-smoking',
   'Smoking is prohibited in parks, beaches, and outdoor dining areas.',
   'New York City and many other municipalities prohibit smoking in parks, beaches, and outdoor dining areas.',
   '2011-05-23',
   'https://www.nyc.gov/site/doh/health/health-topics/smoking.page',
   NOW()),

  -- Texas
  ('TX', 'Texas', 'indoor-smoking',
   'Smoking is prohibited in most public places, but bars and private clubs may allow smoking.',
   'Texas prohibits smoking in most enclosed public places and workplaces, but bars and private clubs may choose to allow smoking.',
   '2007-09-01',
   'https://www.dshs.texas.gov/tobacco/',
   NOW()),

  ('TX', 'Texas', 'outdoor-smoking',
   'Smoking restrictions apply to outdoor dining areas and near building entrances.',
   'Many Texas cities have ordinances restricting smoking in outdoor dining areas and within a certain distance of building entrances.',
   '2007-09-01',
   'https://www.dshs.texas.gov/tobacco/',
   NOW()),

  -- Florida
  ('FL', 'Florida', 'indoor-smoking',
   'Smoking is prohibited in most enclosed public places and workplaces.',
   'Florida prohibits smoking in most enclosed public places and workplaces, with some exceptions for standalone bars.',
   '2003-07-01',
   'https://www.floridahealth.gov/programs-and-services/prevention/tobacco-free-florida/',
   NOW()),

  ('FL', 'Florida', 'vaping',
   'E-cigarettes are prohibited in the same places as traditional cigarettes.',
   'Electronic smoking devices are included in the definition of smoking and are prohibited in the same locations as traditional cigarettes.',
   '2019-07-01',
   'https://www.floridahealth.gov/programs-and-services/prevention/tobacco-free-florida/',
   NOW()),

  -- Colorado
  ('CO', 'Colorado', 'indoor-smoking',
   'Smoking is prohibited in all enclosed public places and workplaces.',
   'Colorado prohibits smoking in all enclosed public places and workplaces, including bars and restaurants.',
   '2006-07-01',
   'https://cdphe.colorado.gov/tobacco',
   NOW()),

  ('CO', 'Colorado', 'cannabis',
   'Recreational cannabis is legal for adults 21 and over, with restrictions on public use.',
   'Adults 21 and over may possess and use cannabis, but smoking is prohibited in public places and while driving.',
   '2012-12-10',
   'https://marijuana.colorado.gov/',
   NOW()),

  -- Washington
  ('WA', 'Washington', 'indoor-smoking',
   'Smoking is prohibited in all enclosed public places and workplaces.',
   'Washington prohibits smoking in all enclosed public places and workplaces, including bars and restaurants.',
   '2005-12-08',
   'https://www.doh.wa.gov/CommunityandEnvironment/Tobacco',
   NOW()),

  ('WA', 'Washington', 'cannabis',
   'Recreational cannabis is legal for adults 21 and over, with restrictions on public use.',
   'Adults 21 and over may possess and use cannabis, but smoking is prohibited in public places and while driving.',
   '2012-12-06',
   'https://lcb.wa.gov/mj-education',
   NOW()),

  -- Oregon
  ('OR', 'Oregon', 'indoor-smoking',
   'Smoking is prohibited in all enclosed public places and workplaces.',
   'Oregon prohibits smoking in all enclosed public places and workplaces, including bars and restaurants.',
   '2009-01-01',
   'https://www.oregon.gov/oha/PH/PREVENTIONWELLNESS/TOBACCOPREVENTION/Pages/index.aspx',
   NOW()),

  ('OR', 'Oregon', 'cannabis',
   'Recreational cannabis is legal for adults 21 and over, with restrictions on public use.',
   'Adults 21 and over may possess and use cannabis, but smoking is prohibited in public places and while driving.',
   '2014-11-04',
   'https://www.oregon.gov/olcc/marijuana/Pages/default.aspx',
   NOW());

-- Verify the insert
SELECT 
  state_code,
  state_name,
  category,
  COUNT(*) as law_count
FROM public.laws
GROUP BY state_code, state_name, category
ORDER BY state_code, category;
