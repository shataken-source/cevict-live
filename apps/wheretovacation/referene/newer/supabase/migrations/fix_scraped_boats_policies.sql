-- Quick fix: Drop and recreate policies for scraped_boats table
-- Run this if you got the "policy already exists" error
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view scraped boats" ON public.scraped_boats;
DROP POLICY IF EXISTS "Service role can manage scraped boats" ON public.scraped_boats;
-- Recreate policies
CREATE POLICY "Public can view scraped boats" ON public.scraped_boats FOR
SELECT USING (true);
CREATE POLICY "Service role can manage scraped boats" ON public.scraped_boats FOR ALL WITH CHECK (true);