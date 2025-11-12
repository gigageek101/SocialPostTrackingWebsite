-- Neon.tech Database Setup
-- Run this in your Neon SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Creators table
CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  profile_picture TEXT,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'threads', 'instagram', 'facebook')),
  handle TEXT NOT NULL,
  device TEXT NOT NULL,
  profile_link TEXT,
  telegram_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Captions table
CREATE TABLE IF NOT EXISTS captions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  slides JSONB NOT NULL,
  title TEXT NOT NULL,
  hashtags TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post logs table
CREATE TABLE IF NOT EXISTS post_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  post_number INTEGER,
  timestamp_utc TIMESTAMPTZ NOT NULL,
  timestamp_creator_tz TEXT NOT NULL,
  timestamp_user_tz TEXT NOT NULL,
  checklist_state JSONB NOT NULL,
  notes TEXT,
  caption_id UUID REFERENCES captions(id) ON DELETE SET NULL,
  skipped BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID UNIQUE NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  user_timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  notifications_enabled BOOLEAN DEFAULT false,
  hide_times_popup BOOLEAN DEFAULT false,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  telegram_notifications_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification log table
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  post_number INTEGER NOT NULL,
  notification_date DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_creator_id ON accounts(creator_id);
CREATE INDEX IF NOT EXISTS idx_captions_account_id ON captions(account_id);
CREATE INDEX IF NOT EXISTS idx_post_logs_account_id ON post_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_post_logs_timestamp ON post_logs(timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_user_settings_creator_id ON user_settings(creator_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_creator_date ON notification_log(creator_id, notification_date);
CREATE INDEX IF NOT EXISTS idx_notification_log_account ON notification_log(account_id, notification_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_captions_updated_at BEFORE UPDATE ON captions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

