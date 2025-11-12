-- Migration: Add Telegram Notification Support
-- Run this in your Supabase SQL Editor

-- Add Telegram fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_notifications_enabled BOOLEAN DEFAULT false;

-- Create notification_log table to track sent notifications
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID NOT NULL,
  post_number INTEGER NOT NULL,
  notification_date DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_log_user_date 
ON notification_log(user_id, notification_date);

CREATE INDEX IF NOT EXISTS idx_notification_log_account 
ON notification_log(account_id, notification_date);

-- Add RLS policies
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
ON notification_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification logs"
ON notification_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Grant access to service role (for the cron job)
GRANT ALL ON notification_log TO service_role;

