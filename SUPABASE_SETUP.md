# Supabase Setup Guide for Photo Upload Application

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `facility-walkthrough-app` (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose the closest region to your users
6. Click "Create new project"
7. Wait for the project to be created (this may take a few minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`)

## Step 3: Set Up Environment Variables

1. Create a `.env.local` file in your project root
2. Add the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Storage bucket name for photos
NEXT_PUBLIC_SUPABASE_SURVEY_BUCKET=survey-photos
```

**Replace the placeholder values with your actual Supabase credentials.**

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `scripts/setup-supabase.sql`
4. Click "Run" to execute the script

This will create:
- A storage bucket for photos
- Database tables for submissions and photos
- Proper indexes for performance
- Row Level Security policies
- Sample data for testing

## Step 5: Configure Storage

1. Go to **Storage** in your Supabase dashboard
2. You should see a `survey-photos` bucket created
3. Click on the bucket to verify it's set to public
4. The storage policies are already set up by the SQL script

## Step 6: Test the Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Try uploading a photo from your application
3. Check the **Storage** section in Supabase to see if the photo was uploaded
4. Check the **Table Editor** → **survey_photos** to see if the metadata was saved

## Step 7: Verify Photo Gallery

1. Upload a few test photos
2. Navigate to the Photo Gallery page (`/scoring`)
3. You should see your uploaded photos with their metadata

## Troubleshooting

### Common Issues:

1. **"getSupabaseServer is not a function"**
   - Make sure you've restarted your development server after updating the environment variables

2. **"Storage bucket not found"**
   - Run the SQL setup script again
   - Check that the bucket name matches in your environment variables

3. **"Permission denied"**
   - Verify your API keys are correct
   - Check that the RLS policies are properly set up

4. **Photos not displaying**
   - Check the browser console for errors
   - Verify the photo URLs are being generated correctly
   - Ensure the storage bucket is set to public

### Environment Variables Check:

Make sure your `.env.local` file has all required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_SURVEY_BUCKET=survey-photos
```

## Security Notes

- The `SUPABASE_SERVICE_ROLE_KEY` should be kept secret and only used on the server side
- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose to the client
- Row Level Security (RLS) is enabled but set to allow all operations for simplicity
- In production, you may want to implement more restrictive RLS policies

## Next Steps

Once Supabase is set up, you can:
1. Upload photos and place them on floorplans
2. View all photos in the gallery
3. Filter photos by building and floor
4. Add more features like photo deletion, editing, etc. 