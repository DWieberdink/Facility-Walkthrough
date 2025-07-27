-- Add building field to survey_photos table
-- Run this in your Supabase SQL Editor

-- Add building column to survey_photos table
ALTER TABLE survey_photos 
ADD COLUMN IF NOT EXISTS building TEXT;

-- Add comment to explain the building column
COMMENT ON COLUMN survey_photos.building IS 'Building name where photo was taken (derived from walker school)';

-- Create index for better performance when filtering by building
CREATE INDEX IF NOT EXISTS idx_survey_photos_building ON survey_photos(building);

-- Update existing photos to set building based on walker's school
-- This joins survey_photos with survey_submissions and walkers to get the school
UPDATE survey_photos 
SET building = (
  SELECT w.school 
  FROM survey_submissions ss 
  JOIN walkers w ON ss.walker_id = w.id 
  WHERE ss.id = survey_photos.submission_id
)
WHERE building IS NULL;

-- Add constraint to ensure building is not null for new photos
ALTER TABLE survey_photos 
ALTER COLUMN building SET NOT NULL;

-- Create a combined index for building and floor for better performance
CREATE INDEX IF NOT EXISTS idx_survey_photos_building_floor ON survey_photos(building, floor_level); 