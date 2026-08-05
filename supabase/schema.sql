-- ============================================================================
-- Team Pulse — Private Multi-Device Session Database Schema & Security Definer RPCs
-- ============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Tables Setup
-- ----------------------------------------------------------------------------

-- Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  admin_secret_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 hours')
);

-- Index for fast room code lookups
CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms (code);

-- Room Option Aggregate Counts Table
CREATE TABLE IF NOT EXISTS public.room_counts (
  room_id UUID PRIMARY KEY REFERENCES public.rooms (id) ON DELETE CASCADE,
  total INTEGER NOT NULL DEFAULT 0,
  very_difficult INTEGER NOT NULL DEFAULT 0,
  difficult INTEGER NOT NULL DEFAULT 0,
  mixed INTEGER NOT NULL DEFAULT 0,
  good INTEGER NOT NULL DEFAULT 0,
  very_good INTEGER NOT NULL DEFAULT 0
);

-- Room Technical Participants Table (Token Hash only, NO answer association!)
CREATE TABLE IF NOT EXISTS public.room_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  participant_token_hash TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_room_participant UNIQUE (room_id, participant_token_hash)
);

-- Index for participant token lookup
CREATE INDEX IF NOT EXISTS idx_room_participants_lookup ON public.room_participants (room_id, participant_token_hash);


-- ----------------------------------------------------------------------------
-- 2. Row Level Security & Privilege Revocation
-- ----------------------------------------------------------------------------

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- Revoke direct anonymous and authenticated access to tables
REVOKE ALL ON TABLE public.rooms FROM anon, authenticated;
REVOKE ALL ON TABLE public.room_counts FROM anon, authenticated;
REVOKE ALL ON TABLE public.room_participants FROM anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. RPC Stored Procedures (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- Function: Create Room
CREATE OR REPLACE FUNCTION public.create_room(
  p_code TEXT,
  p_admin_secret_hash TEXT,
  p_duration_hours INT DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Normalize input code
  p_code := UPPER(TRIM(p_code));

  IF LENGTH(p_code) <> 6 THEN
    RAISE EXCEPTION 'INVALID_CODE_FORMAT';
  END IF;

  v_expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;

  INSERT INTO public.rooms (code, admin_secret_hash, status, created_at, expires_at)
  VALUES (p_code, p_admin_secret_hash, 'open', NOW(), v_expires_at)
  RETURNING id INTO v_room_id;

  INSERT INTO public.room_counts (room_id, total, very_difficult, difficult, mixed, good, very_good)
  VALUES (v_room_id, 0, 0, 0, 0, 0, 0);

  RETURN jsonb_build_object(
    'success', true,
    'code', p_code,
    'expires_at', v_expires_at
  );
END;
$$;


-- Function: Get Public Room Info (Returns status & total count ONLY, NO option breakdown!)
CREATE OR REPLACE FUNCTION public.get_public_room(
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_total INT;
BEGIN
  p_code := UPPER(TRIM(p_code));

  SELECT * INTO v_room FROM public.rooms WHERE code = p_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF NOW() > v_room.expires_at THEN
    RAISE EXCEPTION 'ROOM_EXPIRED';
  END IF;

  IF v_room.status = 'closed' THEN
    RAISE EXCEPTION 'ROOM_CLOSED';
  END IF;

  SELECT total INTO v_total FROM public.room_counts WHERE room_id = v_room.id;

  RETURN jsonb_build_object(
    'code', v_room.code,
    'status', v_room.status,
    'total_votes', COALESCE(v_total, 0)
  );
END;
$$;


-- Function: Submit Room Vote (Atomically records token & increments aggregate counter)
CREATE OR REPLACE FUNCTION public.submit_room_vote(
  p_code TEXT,
  p_option_id TEXT,
  p_participant_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_total INT;
BEGIN
  p_code := UPPER(TRIM(p_code));

  SELECT * INTO v_room FROM public.rooms WHERE code = p_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF NOW() > v_room.expires_at THEN
    RAISE EXCEPTION 'ROOM_EXPIRED';
  END IF;

  IF v_room.status = 'closed' THEN
    RAISE EXCEPTION 'ROOM_CLOSED';
  END IF;

  -- Validate option ID
  IF p_option_id NOT IN ('very-difficult', 'difficult', 'mixed', 'good', 'very-good') THEN
    RAISE EXCEPTION 'INVALID_OPTION_ID';
  END IF;

  -- Prevent duplicate submissions from same token hash
  BEGIN
    INSERT INTO public.room_participants (room_id, participant_token_hash, submitted_at)
    VALUES (v_room.id, p_participant_token_hash, NOW());
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_SUBMITTED';
  END;

  -- Atomic counter increment
  IF p_option_id = 'very-difficult' THEN
    UPDATE public.room_counts SET total = total + 1, very_difficult = very_difficult + 1 WHERE room_id = v_room.id;
  ELSIF p_option_id = 'difficult' THEN
    UPDATE public.room_counts SET total = total + 1, difficult = difficult + 1 WHERE room_id = v_room.id;
  ELSIF p_option_id = 'mixed' THEN
    UPDATE public.room_counts SET total = total + 1, mixed = mixed + 1 WHERE room_id = v_room.id;
  ELSIF p_option_id = 'good' THEN
    UPDATE public.room_counts SET total = total + 1, good = good + 1 WHERE room_id = v_room.id;
  ELSIF p_option_id = 'very-good' THEN
    UPDATE public.room_counts SET total = total + 1, very_good = very_good + 1 WHERE room_id = v_room.id;
  END IF;

  SELECT total INTO v_total FROM public.room_counts WHERE room_id = v_room.id;

  RETURN jsonb_build_object('success', true, 'total', v_total);
END;
$$;


-- Function: Get Facilitator Room State (Requires valid SHA-256 Admin Secret Hash)
CREATE OR REPLACE FUNCTION public.get_facilitator_room_state(
  p_code TEXT,
  p_admin_secret_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_counts public.room_counts%ROWTYPE;
BEGIN
  p_code := UPPER(TRIM(p_code));

  SELECT * INTO v_room FROM public.rooms WHERE code = p_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF v_room.admin_secret_hash <> p_admin_secret_hash THEN
    RAISE EXCEPTION 'INVALID_ADMIN_SECRET';
  END IF;

  SELECT * INTO v_counts FROM public.room_counts WHERE room_id = v_room.id;

  RETURN jsonb_build_object(
    'code', v_room.code,
    'status', v_room.status,
    'created_at', v_room.created_at,
    'expires_at', v_room.expires_at,
    'total', COALESCE(v_counts.total, 0),
    'counts', jsonb_build_object(
      'very-difficult', COALESCE(v_counts.very_difficult, 0),
      'difficult', COALESCE(v_counts.difficult, 0),
      'mixed', COALESCE(v_counts.mixed, 0),
      'good', COALESCE(v_counts.good, 0),
      'very-good', COALESCE(v_counts.very_good, 0),
      'total', COALESCE(v_counts.total, 0)
    )
  );
END;
$$;


-- Function: Close Room Submissions
CREATE OR REPLACE FUNCTION public.close_room(
  p_code TEXT,
  p_admin_secret_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
BEGIN
  p_code := UPPER(TRIM(p_code));

  SELECT * INTO v_room FROM public.rooms WHERE code = p_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF v_room.admin_secret_hash <> p_admin_secret_hash THEN
    RAISE EXCEPTION 'INVALID_ADMIN_SECRET';
  END IF;

  UPDATE public.rooms SET status = 'closed' WHERE id = v_room.id;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- Function: Delete Room
CREATE OR REPLACE FUNCTION public.delete_room(
  p_code TEXT,
  p_admin_secret_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
BEGIN
  p_code := UPPER(TRIM(p_code));

  SELECT * INTO v_room FROM public.rooms WHERE code = p_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF v_room.admin_secret_hash <> p_admin_secret_hash THEN
    RAISE EXCEPTION 'INVALID_ADMIN_SECRET';
  END IF;

  DELETE FROM public.rooms WHERE id = v_room.id;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- Function: Cleanup Expired Rooms
CREATE OR REPLACE FUNCTION public.cleanup_expired_rooms()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM public.rooms WHERE expires_at < NOW() RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;


-- ----------------------------------------------------------------------------
-- 4. Grant Permissions to Anon Role for RPC Functions
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.create_room(TEXT, TEXT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_room(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_room_vote(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_facilitator_room_state(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_room(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_room(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rooms() TO anon, authenticated;
