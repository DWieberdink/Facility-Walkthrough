# Get Your Supabase API Keys for Project: qvpfvpyrgylfbwmbtobm

## Step 1: Go to Your Supabase Project

1. Open your browser and go to: https://supabase.com/dashboard/project/qvpfvpyrgylfbwmbtobm

## Step 2: Get Your API Keys

1. In your project dashboard, click on **Settings** (gear icon) in the left sidebar
2. Click on **API** in the settings menu
3. You'll see two important sections:
   - **Project API keys**
   - **Project URL**

## Step 3: Copy Your Keys

You need to copy these values:

### Project URL
```
https://qvpfvpyrgylfbwmbtobm.supabase.co
```

### API Keys
1. **anon public** key (starts with `eyJ...`)
2. **service_role** key (starts with `eyJ...`)

## Step 4: Update Your .env.local File

Add these lines to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qvpfvpyrgylfbwmbtobm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SUPABASE_SURVEY_BUCKET=survey-photos
```

**Replace `your-anon-key-here` and `your-service-role-key-here` with the actual keys you copied.**

## Step 5: Set Up Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy and paste the contents of `scripts/setup-supabase.sql`
4. Click **Run**

## Step 6: Restart Your App

After updating the `.env.local` file:

```bash
npm run dev
```

## Troubleshooting

If you're still getting errors:

1. **Check your project URL**: Make sure it's exactly `https://qvpfvpyrgylfbwmbtobm.supabase.co`
2. **Verify API keys**: Make sure you copied the full keys (they're very long)
3. **Restart the server**: The environment variables only load when you restart
4. **Check project status**: Make sure your Supabase project is active and not paused

## Need Help?

If you can't access the project or need help finding the keys, let me know and I can help you troubleshoot! 