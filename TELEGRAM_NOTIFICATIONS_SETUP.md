# Telegram Notifications Setup Guide

## Overview

The Social Post Tracking app now supports automated Telegram notifications! A serverless function runs every 10 minutes to check your posting schedule and sends you reminders when it's time to post.

## Prerequisites

1. A Telegram account
2. Supabase project (already configured)
3. Vercel deployment (with Pro plan for Cron Jobs)

## Step 1: Database Migration

Run the following SQL in your Supabase SQL Editor:

```sql
-- Add Telegram fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_notifications_enabled BOOLEAN DEFAULT false;

-- Create notification_log table
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID NOT NULL,
  post_number INTEGER NOT NULL,
  notification_date DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_user_date 
ON notification_log(user_id, notification_date);

CREATE INDEX IF NOT EXISTS idx_notification_log_account 
ON notification_log(account_id, notification_date);

-- Enable RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
ON notification_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification logs"
ON notification_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

GRANT ALL ON notification_log TO service_role;
```

## Step 2: Environment Variables

Add these environment variables to your Vercel project:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CRON_SECRET=generate_a_random_secret_here
```

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is different from the anon key. Find it in:
- Supabase Dashboard → Settings → API → service_role key (secret)

Generate a random CRON_SECRET:
```bash
openssl rand -hex 32
```

## Step 3: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Save the Bot Token (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Step 4: Get Your Chat ID

### For Personal Messages:
1. Search for `@userinfobot` on Telegram
2. Send `/start`
3. Copy your Chat ID (looks like: `123456789`)

### For Groups:
1. Add your bot to the group
2. Send a message in the group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for `"chat":{"id":-1001234567890` (negative number for groups)
5. Copy the chat ID

## Step 5: Configure in App

1. Open the app
2. Go to Settings
3. Scroll to "Telegram Notifications" section
4. Enter your Bot Token and Chat ID
5. Click "Save Telegram Settings"
6. Enable notifications with the toggle

## Step 6: Test

1. Make sure you've started a conversation with your bot (send `/start`)
2. Wait up to 10 minutes for the next cron job run
3. You should receive a notification when a post is due!

## How It Works

1. Every 10 minutes, Vercel Cron triggers `/api/check-and-notify`
2. The API fetches all users with Telegram enabled from Supabase
3. For each user, it calculates upcoming posts (within next 10 minutes)
4. Sends Telegram notifications for posts that are ready
5. Logs sent notifications to prevent duplicates

## Notification Format

```
🔔 Time to Post!

📱 Platform: TIKTOK
👤 Account: @yourhandle
📊 Post: #2
⏰ Scheduled: 10:00 AM

✅ Open the app and make your post now!
🌐 https://social-post-tracking.vercel.app
```

## Troubleshooting

### Not Receiving Notifications?

1. **Check bot conversation**: Make sure you've started a conversation with your bot
2. **Verify settings**: Go to Settings and ensure Telegram is enabled
3. **Check logs**: View Vercel Function logs for errors
4. **Verify environment variables**: Ensure all env vars are set correctly
5. **Check Supabase**: Verify the migration ran successfully

### Still Having Issues?

1. Check Vercel deployment logs
2. Verify the cron job is running (Vercel Dashboard → Cron Jobs)
3. Test manually by calling `/api/check-and-notify` directly
4. Check Supabase logs for database errors

## Cost

- **Vercel Cron Jobs**: Requires Vercel Pro plan ($20/month)
- **Supabase**: Free tier should be sufficient
- **Telegram**: Completely free!

## Alternative: Self-Hosted

If you don't want to pay for Vercel Pro, you can:

1. Deploy the API endpoint to any serverless provider
2. Set up a cron job on your server
3. Use services like cron-job.org to trigger the endpoint

Just make sure to include the `CRON_SECRET` in the Authorization header:
```
Authorization: Bearer your_cron_secret
```

