# ⚠️ IMPORTANT: Supabase Environment Variables for Vercel

For the database to work across devices, you **MUST** set these environment variables in Vercel:

## Step-by-Step Setup:

### 1. Get Your Supabase Credentials
From your `.env.local` file:
- `VITE_SUPABASE_URL` = Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key

### 2. Add to Vercel:

1. Go to: https://vercel.com/[your-username]/[your-project-name]/settings/environment-variables

2. Add these TWO variables:
   - Name: `VITE_SUPABASE_URL`
     Value: [paste from .env.local]
     
   - Name: `VITE_SUPABASE_ANON_KEY`
     Value: [paste from .env.local]

3. Make sure to check "Production", "Preview", and "Development"

4. **IMPORTANT**: After adding the variables, you MUST redeploy:
   - Go to Deployments tab
   - Click "..." on the latest deployment
   - Click "Redeploy"

### 3. Verify It's Working:

Open the app on your phone and check the browser console (if you can access it):
- Should see: `🔄 Loading data from Supabase...`
- Should see: `✅ Data loaded: X accounts, Y posts`

If you see `Supabase not configured`, the environment variables aren't set!

---

## Quick Test:

1. On Phone 1: 
   - Login
   - Add a test account
   - You should see console log: "Syncing to Supabase..."

2. On Phone 2:
   - Login with same username/password
   - You should see console log: "Loading from Supabase..."
   - The test account should appear!

## Current Status:
- ✅ Code is deployed with sync functionality
- ⚠️ **YOU MUST SET VERCEL ENV VARIABLES**
- ⚠️ **YOU MUST REDEPLOY AFTER SETTING THEM**

