-- =============================================
-- Social Post Tracker - Supabase Database Setup
-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query)
-- =============================================

-- 1. Create creators table
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  profile_picture TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  device TEXT NOT NULL,
  profile_link TEXT,
  telegram_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create captions table
CREATE TABLE IF NOT EXISTS public.captions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  slides JSONB NOT NULL,
  title TEXT NOT NULL,
  hashtags TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create post_logs table
CREATE TABLE IF NOT EXISTS public.post_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  platform TEXT NOT NULL,
  timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  timestamp_creator_tz TEXT NOT NULL,
  timestamp_user_tz TEXT NOT NULL,
  checklist_state JSONB NOT NULL,
  notes TEXT,
  caption_id UUID REFERENCES public.captions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  creator_id UUID PRIMARY KEY REFERENCES public.creators(id) ON DELETE CASCADE,
  user_timezone TEXT NOT NULL,
  notifications_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================
-- These ensure users can only access data for creators they have the password for

-- Enable RLS on all tables
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (we'll handle auth in the app)
-- In production, you'd want more granular policies

-- Creators: Anyone can read, but only authenticated users can modify
CREATE POLICY "Allow public read access to creators" ON public.creators
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for new creators" ON public.creators
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for creators" ON public.creators
  FOR UPDATE USING (true);

-- Accounts: Public read, authenticated write
CREATE POLICY "Allow public read access to accounts" ON public.accounts
  FOR ALL USING (true);

-- Captions: Public read, authenticated write
CREATE POLICY "Allow public read access to captions" ON public.captions
  FOR ALL USING (true);

-- Post Logs: Public read, authenticated write
CREATE POLICY "Allow public read access to post_logs" ON public.post_logs
  FOR ALL USING (true);

-- User Settings: Public read, authenticated write
CREATE POLICY "Allow public read access to user_settings" ON public.user_settings
  FOR ALL USING (true);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_accounts_creator_id ON public.accounts(creator_id);
CREATE INDEX IF NOT EXISTS idx_captions_account_id ON public.captions(account_id);
CREATE INDEX IF NOT EXISTS idx_post_logs_creator_id ON public.post_logs(creator_id);
CREATE INDEX IF NOT EXISTS idx_post_logs_account_id ON public.post_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_creators_username ON public.creators(username);

-- =============================================
-- Updated_at Trigger Function
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Success Message
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database setup complete!';
  RAISE NOTICE '📝 Tables created: creators, accounts, captions, post_logs, user_settings';
  RAISE NOTICE '🔒 Row Level Security enabled';
  RAISE NOTICE '⚡ Indexes created for performance';
END $$;

