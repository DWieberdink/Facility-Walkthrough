# Floorplan Photo Connection Issue - Fix

## Problem Description

The images on floor plans were not staying connected to their assigned floor plans and were showing up in other floor plans as well. This was happening because:

1. **Photos were only stored with `floor_level`** (like "first", "second") but **no building information**
2. **The floorplan gallery was filtering by floor only**, not by building
3. **When viewing "Building A - First Floor", photos from any building with `floor_level = "first"` would show up**

## Root Cause

The `survey_photos` table only had a `floor_level` field but no `building` field. Photos were being associated with floor levels but not with specific buildings, causing cross-contamination between different buildings' floor plans.

## Solution Implemented

### 1. Quick Fix (Already Applied)
Modified the `floorplan-gallery.tsx` component to filter photos by both building (derived from walker's school) and floor level:

```typescript
const getPhotosForCurrentFloor = () => {
  const floor = selectedFloor || currentFloor
  
  return submissions
    .flatMap(sub => sub.photos)
    .filter(photo => 
      photo.building === currentBuilding && 
      photo.floor_level === floor && 
      photo.location_x !== null && 
      photo.location_y !== null
    )
}
```

### 2. Database Schema Update (Recommended)
Added a `building` field to the `survey_photos` table to store building information directly with each photo.

**Migration Script**: `scripts/add-building-to-photos.sql`

This script:
- Adds a `building` TEXT column to `survey_photos`
- Populates existing photos with building data from walker's school
- Creates indexes for better performance
- Makes the building field required for new photos

### 3. Photo Upload Update
Modified the photo upload API (`app/api/photos/upload/route.ts`) to:
- Fetch building information from the submission's walker
- Store the building name directly in the photo record
- Handle both array and object formats for the walkers field

### 4. Interface Updates
Updated `PhotoRecord` interfaces in:
- `lib/storage.ts`
- `components/floorplan-gallery.tsx`
- `app/scoring/page.tsx`

## How to Apply the Fix

### Step 1: Run the Database Migration
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `scripts/add-building-to-photos.sql`
4. Click "Run"

### Step 2: Restart Your Application
```bash
npm run dev
```

### Step 3: Test the Fix
1. Upload photos to different buildings
2. View the floorplan gallery for each building
3. Verify that photos only appear on their assigned building's floor plan

## Benefits of This Solution

1. **Accurate Photo Placement**: Photos will only appear on the correct building's floor plan
2. **Better Performance**: Database indexes on building and floor_level for faster queries
3. **Data Integrity**: Building information is stored directly with each photo
4. **Future-Proof**: Supports multiple buildings with the same floor levels

## Verification

After applying the fix, you should see:
- Photos only appear on their assigned building's floor plan
- No cross-contamination between different buildings
- Proper filtering when switching between buildings and floors
- Improved performance when loading floorplan galleries

## Troubleshooting

If photos still appear on wrong floor plans:
1. Check that the database migration ran successfully
2. Verify that existing photos have the correct building field populated
3. Ensure new photo uploads include building information
4. Check browser console for any JavaScript errors 