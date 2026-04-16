-- Migration: add card table and card_id to expense
-- Run manually in Supabase Studio

CREATE TABLE IF NOT EXISTS card (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID      NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  last_four  TEXT,
  color      TEXT        NOT NULL DEFAULT '#6366f1',
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE expense ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES card(id);
