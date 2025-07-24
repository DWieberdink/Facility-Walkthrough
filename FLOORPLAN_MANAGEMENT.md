# Floor Plan Management Guide

## Overview

This guide explains how to manage floor plans in your survey application. Floor plans are now stored in Supabase Storage instead of static files, providing better flexibility and management capabilities.

## Current Setup

### Static Files (Legacy)
- `public/floorplan.jpg` - First floor plan
- `public/second-floor-plan.jpg` - Second floor plan

### Supabase Storage (New)
- **Storage Bucket**: `floor-plans`
- **Database Table**: `floor_plans`
- **Admin Interface**: `/admin/floorplans`

## Migration Process

### Step 1: Set Up Supabase Storage

1. **Run the SQL Setup Script**:
   ```sql
   -- Copy and paste the contents of scripts/setup-floorplan-storage.sql
   -- into your Supabase SQL Editor and run it
   ```

2. **Or Use the Migration Script**:
   ```bash
   node scripts/migrate-floorplans.js
   ```

### Step 2: Upload Your New Floor Plans

1. **Access the Admin Interface**:
   - Navigate to `/admin/floorplans` in your application
   - Click "Upload Floor Plan"

2. **Fill in the Details**:
   - **Building Name**: e.g., "Main Building", "Science Wing"
   - **Floor Level**: Select from dropdown (Basement, First Floor, Second Floor, etc.)
   - **Floor Plan Image**: Upload your new floor plan file
   - **Description**: Optional description of the floor plan
   - **Uploaded By**: Your name (optional)

3. **Upload**: Click "Upload Floor Plan" to save

### Step 3: Update Components (Optional)

The components are currently set up to use static files as fallbacks. To use the new Supabase storage:

1. **Uncomment the dynamic loading code** in:
   - `components/floorplan-modal.tsx`
   - `components/floorplan-gallery.tsx`

2. **Replace the static file references** with dynamic URLs

## Managing Floor Plans

### Admin Interface Features

- **Upload New Floor Plans**: Add new floor plans for different buildings/floors
- **View All Floor Plans**: See thumbnails and metadata for all uploaded plans
- **Delete Floor Plans**: Remove outdated or incorrect floor plans
- **Version Control**: Each upload creates a new version

### Database Schema

```sql
floor_plans table:
- id: UUID (Primary Key)
- building_name: TEXT (Building name)
- floor_level: TEXT (first, second, basement, etc.)
- file_name: TEXT (Original filename)
- file_path: TEXT (Storage path)
- file_size: INTEGER (File size in bytes)
- mime_type: TEXT (File type)
- description: TEXT (Optional description)
- is_active: BOOLEAN (Currently active version)
- version: INTEGER (Version number)
- uploaded_at: TIMESTAMP (Upload date)
- uploaded_by: TEXT (Who uploaded it)
- created_at: TIMESTAMP (Record creation date)
- updated_at: TIMESTAMP (Last update date)
```

### Storage Structure

```
floor-plans bucket:
├── main-building-first-floor-1234567890.jpg
├── main-building-second-floor-1234567891.jpg
├── science-wing-first-floor-1234567892.jpg
└── ...
```

## Best Practices

### File Requirements
- **Formats**: JPG, PNG, GIF, WebP
- **Max Size**: 10MB per file
- **Resolution**: High resolution for clarity (recommended: 2000x1500+ pixels)
- **Aspect Ratio**: Consider the display area (16:9 or 4:3 work well)

### Naming Conventions
- **Building Names**: Use consistent naming (e.g., "Main Building", "Science Wing")
- **Floor Levels**: Use standard terms (first, second, basement, third, fourth)
- **Descriptions**: Include key features or areas (e.g., "Includes cafeteria and gym")

### Version Management
- **Keep Old Versions**: Don't delete old floor plans immediately
- **Update Process**: Upload new version → Test → Deactivate old version
- **Documentation**: Use descriptions to note changes between versions

## Troubleshooting

### Common Issues

1. **Floor Plan Not Loading**:
   - Check if the file exists in Supabase Storage
   - Verify the database record is active
   - Check browser console for errors

2. **Upload Fails**:
   - Ensure file size is under 10MB
   - Check file format is supported
   - Verify Supabase permissions

3. **Wrong Floor Plan Shows**:
   - Check building name and floor level match
   - Verify the correct version is active
   - Clear browser cache

### Debugging

1. **Check Storage Bucket**:
   ```javascript
   // In browser console
   const { data } = await supabase.storage.from('floor-plans').list()
   console.log(data)
   ```

2. **Check Database Records**:
   ```javascript
   // In browser console
   const { data } = await supabase.from('floor_plans').select('*')
   console.log(data)
   ```

3. **Test URL Generation**:
   ```javascript
   // In browser console
   const { data } = supabase.storage.from('floor-plans').getPublicUrl('filename.jpg')
   console.log(data.publicUrl)
   ```

## API Reference

### Floor Plan Utilities

```typescript
// Get all active floor plans
const plans = await getActiveFloorPlans()

// Get specific floor plan
const plan = await getFloorPlan('Main Building', 'first')

// Upload new floor plan
const newPlan = await uploadFloorPlan({
  file: fileObject,
  buildingName: 'Main Building',
  floorLevel: 'first',
  description: 'Updated first floor plan'
})

// Get floor plan URL
const url = await getFloorPlanUrlForBuilding('Main Building', 'first')

// Delete floor plan
await deleteFloorPlan(planId)
```

### Component Props

```typescript
// FloorplanModal
interface FloorplanModalProps {
  isOpen: boolean
  onClose: () => void
  onLocationSelected: (x: number, y: number, floor: string) => void
  photoId?: string
}

// FloorplanGallery
interface FloorplanGalleryProps {
  isOpen: boolean
  onClose: () => void
  submissions: SubmissionWithPhotos[]
  selectedBuilding?: string
  selectedFloor?: string
}
```

## Future Enhancements

### Planned Features
- **Multiple Building Support**: Manage floor plans for multiple buildings
- **Floor Plan Editor**: Built-in editor for marking areas/zones
- **Photo Integration**: Direct linking between photos and floor plan locations
- **Export/Import**: Bulk floor plan management
- **Analytics**: Track floor plan usage and photo distribution

### Customization Options
- **Custom Floor Levels**: Add support for mezzanines, sub-basements, etc.
- **Floor Plan Categories**: Organize by building type or purpose
- **Access Control**: Role-based floor plan access
- **Mobile Optimization**: Touch-friendly floor plan interaction

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the browser console for errors
3. Verify Supabase configuration
4. Test with the admin interface at `/admin/floorplans` 