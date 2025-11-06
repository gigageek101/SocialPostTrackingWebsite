# 🚀 Supabase Multi-Device Sync Setup Guide

## Step 1: Create Supabase Project (2 minutes)

1. Go to **https://supabase.com**
2. Click **"Start your project"** → Sign up with GitHub/Google
3. Click **"New Project"**
4. Fill in:
   - **Name**: `Social Post Tracker`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your location
5. Click **"Create new project"**
6. ⏳ Wait ~2 minutes for project to spin up

---

## Step 2: Run Database Setup (1 minute)

1. In your Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the file `supabase-setup.sql` from your project folder
4. Copy ALL the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)
7. ✅ You should see success messages at the bottom

---

## Step 3: Get Your API Credentials (1 minute)

1. Go to **Settings** → **API** (left sidebar, bottom)
2. Copy these two values:

### Project URL
```
https://xxxxxxxxxxxxx.supabase.co
```

### anon/public Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
(long string)
```

---

## Step 4: Add Credentials to Your App

### Option A: Create `.env` file manually

1. In your project root folder, create a file named `.env`
2. Add these lines (replace with YOUR values):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Option B: I'll help you add it

Just paste your URL and key in the chat, and I'll configure it for you!

---

## Step 5: Test It Out

1. Restart your dev server: `npm run dev`
2. Create a new creator with username + password
3. Open another device/browser
4. Access via `/username` and enter the password
5. ✅ All data syncs automatically!

---

## 🎯 How It Works

### Creating a Creator
1. Set **username** (e.g., "allison")
2. Set **password** (encrypted, secure)
3. Data is saved to cloud ☁️
4. URL generated: `yourdomain.com/allison`

### Accessing from Another Device
1. Go to `yourdomain.com/allison`
2. Enter password
3. All data loads instantly
4. Changes sync in real-time across ALL devices

---

## 🔒 Security Features

✅ **Passwords are hashed** (bcrypt) - even I can't see them
✅ **Row Level Security** - each creator's data is isolated
✅ **HTTPS only** - encrypted in transit
✅ **Anon key is safe** - only allows authorized operations

---

## 📊 What Gets Synced

- ✅ Creators & profile pictures
- ✅ All social media accounts
- ✅ Captions (TikTok)
- ✅ Post logs & history
- ✅ User settings & timezone
- ✅ Checklist completions
- ✅ Notes

---

## 🆘 Troubleshooting

### "Supabase not configured" error
→ Make sure `.env` file exists with correct URL and key

### Can't run SQL setup
→ Make sure you're in the SQL Editor (not Table Editor)
→ Check for any typos in the SQL

### Password not working
→ Passwords are case-sensitive
→ Make sure you're using the correct username

### Data not syncing
→ Check browser console for errors
→ Verify you're logged in with correct creator
→ Make sure Supabase project is not paused (free tier pauses after inactivity)

---

## 🎉 You're Done!

Once you complete these steps, your app will:
- ✅ Save all data to the cloud
- ✅ Sync across all devices in real-time
- ✅ Secure with password protection per creator
- ✅ Accessible from anywhere via custom URLs

**Need help?** Just ask! 🚀

