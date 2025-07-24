-- Setup Floor Plan Storage in Supabase
-- Run this in your Supabase SQL Editor

-- Create storage bucket for floor plans
INSERT INTO storage.buckets (id, name, public) 
VALUES ('floor-plans', 'floor-plans', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the floor plans bucket
CREATE POLICY "Allow public read access to floor plans" ON storage.objects
  FOR SELECT USING (bucket_id = 'floor-plans');

CREATE POLICY "Allow authenticated uploads to floor plans" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'floor-plans');

CREATE POLICY "Allow authenticated updates to floor plans" ON storage.objects
  FOR UPDATE USING (bucket_id = 'floor-plans');

CREATE POLICY "Allow authenticated deletes from floor plans" ON storage.objects
  FOR DELETE USING (bucket_id = 'floor-plans');

-- Create floor_plans table to track floor plan metadata
CREATE TABLE IF NOT EXISTS floor_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    building_name TEXT NOT NULL,
    floor_level TEXT NOT NULL CHECK (floor_level IN ('first', 'second', 'basement', 'third', 'fourth')),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one active floor plan per building/floor combination
    UNIQUE(building_name, floor_level, is_active)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_floor_plans_building_floor ON floor_plans(building_name, floor_level);
CREATE INDEX IF NOT EXISTS idx_floor_plans_active ON floor_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_floor_plans_uploaded_at ON floor_plans(uploaded_at);

-- Enable Row Level Security (RLS)
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to allow all operations (for development)
CREATE POLICY "Allow all operations on floor_plans" ON floor_plans FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_floor_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_floor_plans_updated_at 
  BEFORE UPDATE ON floor_plans 
  FOR EACH ROW EXECUTE FUNCTION update_floor_plans_updated_at();

-- Insert sample floor plans (you can update these with your actual floor plans)
INSERT INTO floor_plans (building_name, floor_level, file_name, file_path, description, uploaded_by) VALUES
('Main Building', 'first', 'main-building-first-floor.jpg', 'floor-plans/main-building-first-floor.jpg', 'First floor plan of the main building', 'admin'),
('Main Building', 'second', 'main-building-second-floor.jpg', 'floor-plans/main-building-second-floor.jpg', 'Second floor plan of the main building', 'admin')
ON CONFLICT (building_name, floor_level, is_active) DO NOTHING; 