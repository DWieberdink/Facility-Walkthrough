-- Add location columns to survey_photos table
ALTER TABLE survey_photos 
ADD COLUMN IF NOT EXISTS location_x DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS location_y DECIMAL(5,2);

-- Add comment to explain the location columns
COMMENT ON COLUMN survey_photos.location_x IS 'X coordinate on floorplan as percentage (0-100)';
COMMENT ON COLUMN survey_photos.location_y IS 'Y coordinate on floorplan as percentage (0-100)';
