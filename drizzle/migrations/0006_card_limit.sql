-- Migration: add credit_limit to card table
-- Run manually in Supabase Studio

ALTER TABLE card ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12, 2);
