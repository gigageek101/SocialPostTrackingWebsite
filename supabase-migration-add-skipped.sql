-- Migration: Add 'skipped' column to post_logs table
-- Run this in Supabase SQL Editor if the skipped column doesn't exist

ALTER TABLE public.post_logs 
ADD COLUMN IF NOT EXISTS skipped BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.post_logs.skipped IS 'True if post was skipped (no cooldown applied)';

