import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://gijuqojmrwqmmnuhmqxy.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEyYmMyYTJjLTU5YWEtNGQwMS1iODc1LWJjYWVmNTQ2Mzk4MSJ9.eyJwcm9qZWN0SWQiOiJnaWp1cW9qbXJ3cW1tbnVobXF4eSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzYzNzIxODE3LCJleHAiOjIwNzkwODE4MTcsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.hvkTkntABhgu2zXk-1gmrbaO6Mn4dybduI3jEttfufE';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };