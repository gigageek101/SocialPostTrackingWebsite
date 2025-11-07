-- =============================================
-- COMPLETELY DELETE ALL DATA FROM DATABASE
-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- WARNING: This will DELETE ALL DATA - cannot be undone!
-- =============================================

-- Delete data in order (respecting foreign key constraints)

-- 1. Delete post logs (references captions and accounts)
TRUNCATE TABLE public.post_logs CASCADE;

-- 2. Delete captions (references accounts)
TRUNCATE TABLE public.captions CASCADE;

-- 3. Delete user settings (references creators)
TRUNCATE TABLE public.user_settings CASCADE;

-- 4. Delete accounts (references creators)
TRUNCATE TABLE public.accounts CASCADE;

-- 5. Delete creators (top level table)
TRUNCATE TABLE public.creators CASCADE;

-- Verify all tables are empty
DO $$
DECLARE
  table_counts TEXT;
BEGIN
  SELECT string_agg(
    format('%s: %s rows', 
      tablename, 
      (SELECT count(*) FROM public[tablename])::text
    ), 
    E'\n'
  )
  INTO table_counts
  FROM pg_tables 
  WHERE schemaname = 'public';
  
  RAISE NOTICE E'✅ All data deleted!\n\nTable status:\n%', table_counts;
END $$;

