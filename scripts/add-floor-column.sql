-- Add floor column to survey_photos table to track which floor the photo was taken on
ALTER TABLE survey_photos 
ADD COLUMN IF NOT EXISTS floor_level TEXT;

-- Add comment to explain the floor column
COMMENT ON COLUMN survey_photos.floor_level IS 'Floor level where photo was taken (first, second, unknown)';

-- Create index for better performance when filtering by floor
CREATE INDEX IF NOT EXISTS idx_survey_photos_floor_level ON survey_photos(floor_level);
