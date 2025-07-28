-- Fix Building and Floor Photo Linking
-- Run this in your Supabase SQL Editor at: https://supabase.com/dashboard/project/qvpfvpyrgylfbwmbtobm/editor/17576?schema=public

-- 1. Add building column to survey_photos table if it doesn't exist
ALTER TABLE survey_photos 
ADD COLUMN IF NOT EXISTS building TEXT;

-- 2. Add comment to explain the building column
COMMENT ON COLUMN survey_photos.building IS 'Building name where photo was taken (derived from walker school)';

-- 3. Create index for better performance when filtering by building
CREATE INDEX IF NOT EXISTS idx_survey_photos_building ON survey_photos(building);

-- 4. Update existing photos to set building based on walker's school
-- This joins survey_photos with survey_submissions and walkers to get the school
UPDATE survey_photos 
SET building = (
  SELECT w.school 
  FROM survey_submissions ss 
  JOIN walkers w ON ss.walker_id = w.id 
  WHERE ss.id = survey_photos.submission_id
)
WHERE building IS NULL;

-- 5. Set default value for any remaining NULL building values
UPDATE survey_photos 
SET building = 'Unknown Building'
WHERE building IS NULL;

-- 6. Create a combined index for building and floor for better performance
CREATE INDEX IF NOT EXISTS idx_survey_photos_building_floor ON survey_photos(building, floor_level);

-- 7. Verify the changes by showing a sample of photos with building info
SELECT 
  id,
  submission_id,
  building,
  floor_level,
  location_x,
  location_y,
  uploaded_at
FROM survey_photos 
ORDER BY uploaded_at DESC 
LIMIT 10; 