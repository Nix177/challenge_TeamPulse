-- DO NOT EXECUTE — prototype used generic public objects and is retained only for historical review.
-- ============================================================================
-- Team Pulse — Prototype Draft (Deprecated & Unsafe for Shared Supabase Projects)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  admin_secret_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 hours')
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms (code);

CREATE TABLE IF NOT EXISTS public.room_counts (
  room_id UUID PRIMARY KEY REFERENCES public.rooms (id) ON DELETE CASCADE,
  total INTEGER NOT NULL DEFAULT 0,
  very_difficult INTEGER NOT NULL DEFAULT 0,
  difficult INTEGER NOT NULL DEFAULT 0,
  mixed INTEGER NOT NULL DEFAULT 0,
  good INTEGER NOT NULL DEFAULT 0,
  very_good INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.room_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  participant_token_hash TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_room_participant UNIQUE (room_id, participant_token_hash)
);

CREATE INDEX IF NOT EXISTS idx_room_participants_lookup ON public.room_participants (room_id, participant_token_hash);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rooms FROM anon, authenticated;
REVOKE ALL ON TABLE public.room_counts FROM anon, authenticated;
REVOKE ALL ON TABLE public.room_participants FROM anon, authenticated;
