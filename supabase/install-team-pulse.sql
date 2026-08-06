-- ============================================================================
-- Team Pulse — Shared Supabase Main Installation Script
-- ============================================================================
-- ISOLATED NAMESPACE: team_pulse_private schema & public.tp_* RPC functions.
-- All objects marked with comment 'team-pulse:v1' for ownership and collision protection.
-- Wrap in transaction block to ensure atomic installation or rollback on error.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Pre-installation Collision & Ownership Verification
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_private_exists BOOLEAN;
  v_schema_marker BOOLEAN := FALSE;
  v_rpc_exists BOOLEAN;
  v_rpc_marker BOOLEAN := FALSE;
BEGIN
  -- Check Schema
  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'team_pulse_private'
  ) INTO v_private_exists;

  IF v_private_exists THEN
    SELECT (pg_catalog.obj_description('team_pulse_private'::regnamespace, 'pg_namespace') LIKE '%team-pulse:v1%')
    INTO v_schema_marker;
    
    IF NOT v_schema_marker THEN
      RAISE EXCEPTION 'COLLISION_ERROR: Schema team_pulse_private exists without team-pulse:v1 marker!';
    END IF;
  END IF;

  -- Check tp_create_room RPC
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'tp_create_room'
  ) INTO v_rpc_exists;

  IF v_rpc_exists THEN
    SELECT (pg_catalog.obj_description(p.oid, 'pg_proc') LIKE '%team-pulse:v1%')
    INTO v_rpc_marker
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'tp_create_room';

    IF NOT v_rpc_marker THEN
      RAISE EXCEPTION 'COLLISION_ERROR: public.tp_create_room exists without team-pulse:v1 marker!';
    END IF;
  END IF;
END;
$$;


-- ----------------------------------------------------------------------------
-- 2. Create Isolated Private Schema
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS team_pulse_private;
COMMENT ON SCHEMA team_pulse_private IS 'team-pulse:v1';


-- ----------------------------------------------------------------------------
-- 3. Create Private Tables & Indexes
-- ----------------------------------------------------------------------------

-- Rooms Table
CREATE TABLE IF NOT EXISTS team_pulse_private.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  admin_secret_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (pg_catalog.now() + INTERVAL '12 hours')
);
COMMENT ON TABLE team_pulse_private.rooms IS 'team-pulse:v1';

CREATE INDEX IF NOT EXISTS idx_tp_rooms_code ON team_pulse_private.rooms (code);

-- Room Counts Table
CREATE TABLE IF NOT EXISTS team_pulse_private.room_counts (
  room_id UUID PRIMARY KEY REFERENCES team_pulse_private.rooms (id) ON DELETE CASCADE,
  total INTEGER NOT NULL DEFAULT 0,
  very_difficult INTEGER NOT NULL DEFAULT 0,
  difficult INTEGER NOT NULL DEFAULT 0,
  mixed INTEGER NOT NULL DEFAULT 0,
  good INTEGER NOT NULL DEFAULT 0,
  very_good INTEGER NOT NULL DEFAULT 0
);
COMMENT ON TABLE team_pulse_private.room_counts IS 'team-pulse:v1';

-- Room Participants Table (Technical Token Hashes ONLY, NO selected option!)
CREATE TABLE IF NOT EXISTS team_pulse_private.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES team_pulse_private.rooms (id) ON DELETE CASCADE,
  participant_token_hash TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT unique_tp_room_participant UNIQUE (room_id, participant_token_hash)
);
COMMENT ON TABLE team_pulse_private.participants IS 'team-pulse:v1';

CREATE INDEX IF NOT EXISTS idx_tp_participants_lookup ON team_pulse_private.participants (room_id, participant_token_hash);


-- ----------------------------------------------------------------------------
-- 4. Enable Row Level Security & Revoke Direct Table Access
-- ----------------------------------------------------------------------------
ALTER TABLE team_pulse_private.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_pulse_private.room_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_pulse_private.participants ENABLE ROW LEVEL SECURITY;

-- Revoke all direct privileges on private schema and tables
REVOKE USAGE ON SCHEMA team_pulse_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE team_pulse_private.rooms FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE team_pulse_private.room_counts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE team_pulse_private.participants FROM PUBLIC, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. Create SECURITY DEFINER RPC Functions in Public Namespace (tp_* Prefix)
-- ----------------------------------------------------------------------------

-- Function 1: tp_create_room
CREATE OR REPLACE FUNCTION public.tp_create_room(
  p_code TEXT,
  p_admin_secret_hash TEXT,
  p_duration_hours INT DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_room_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_normalized_code TEXT;
BEGIN
  v_normalized_code := pg_catalog.upper(pg_catalog.btrim(p_code));

  IF pg_catalog.length(v_normalized_code) <> 6 THEN
    RAISE EXCEPTION 'INVALID_CODE_FORMAT';
  END IF;

  v_expires_at := pg_catalog.now() + (p_duration_hours || ' hours')::INTERVAL;

  INSERT INTO team_pulse_private.rooms (code, admin_secret_hash, status, created_at, expires_at)
  VALUES (v_normalized_code, p_admin_secret_hash, 'open', pg_catalog.now(), v_expires_at)
  RETURNING id INTO v_room_id;

  INSERT INTO team_pulse_private.room_counts (room_id, total, very_difficult, difficult, mixed, good, very_good)
  VALUES (v_room_id, 0, 0, 0, 0, 0, 0);

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'code', v_normalized_code,
    'expires_at', v_expires_at
  );
END;
$$;
COMMENT ON FUNCTION public.tp_create_room(TEXT, TEXT, INT) IS 'team-pulse:v1';


-- Function 2: tp_get_public_room (Returns status & total count when open; includes aggregated counts once closed)
CREATE OR REPLACE FUNCTION public.tp_get_public_room(
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_room team_pulse_private.rooms%ROWTYPE;
  v_counts team_pulse_private.room_counts%ROWTYPE;
  v_normalized_code TEXT;
BEGIN
  v_normalized_code := pg_catalog.upper(pg_catalog.btrim(p_code));

  SELECT * INTO v_room FROM team_pulse_private.rooms WHERE code = v_normalized_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF pg_catalog.now() > v_room.expires_at THEN
    RAISE EXCEPTION 'ROOM_EXPIRED';
  END IF;

  SELECT * INTO v_counts FROM team_pulse_private.room_counts WHERE room_id = v_room.id;

  IF v_room.status = 'closed' THEN
    RETURN pg_catalog.jsonb_build_object(
      'code', v_room.code,
      'status', v_room.status,
      'total_votes', COALESCE(v_counts.total, 0),
      'counts', pg_catalog.jsonb_build_object(
        'very-difficult', COALESCE(v_counts.very_difficult, 0),
        'difficult', COALESCE(v_counts.difficult, 0),
        'mixed', COALESCE(v_counts.mixed, 0),
        'good', COALESCE(v_counts.good, 0),
        'very-good', COALESCE(v_counts.very_good, 0),
        'total', COALESCE(v_counts.total, 0)
      )
    );
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'code', v_room.code,
    'status', v_room.status,
    'total_votes', COALESCE(v_counts.total, 0)
  );
END;
$$;
COMMENT ON FUNCTION public.tp_get_public_room(TEXT) IS 'team-pulse:v1';


-- Function 3: tp_submit_vote (Atomically records token & increments option counter)
CREATE OR REPLACE FUNCTION public.tp_submit_vote(
  p_code TEXT,
  p_option_id TEXT,
  p_participant_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_room team_pulse_private.rooms%ROWTYPE;
  v_total INT;
  v_normalized_code TEXT;
BEGIN
  v_normalized_code := pg_catalog.upper(pg_catalog.btrim(p_code));

  SELECT * INTO v_room FROM team_pulse_private.rooms WHERE code = v_normalized_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF pg_catalog.now() > v_room.expires_at THEN
    RAISE EXCEPTION 'ROOM_EXPIRED';
  END IF;

  IF v_room.status = 'closed' THEN
    RAISE EXCEPTION 'ROOM_CLOSED';
  END IF;

  IF p_option_id NOT IN ('very-difficult', 'difficult', 'mixed', 'good', 'very-good') THEN
    RAISE EXCEPTION 'INVALID_OPTION_ID';
  END IF;

  BEGIN
    INSERT INTO team_pulse_private.participants (room_id, participant_token_hash, submitted_at)
    VALUES (v_room.id, p_participant_token_hash, pg_catalog.now());
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_SUBMITTED';
  END;

  IF p_option_id = 'very-difficult' THEN
    UPDATE team_pulse_private.room_counts SET total = total + 1, very_difficult = very_difficult + 1 WHERE room_id = v_room.id;
  ELSIF p_option_id = 'difficult' THEN
    UPDATE team_pulse_private.room_counts SET total = total + 1, difficult = difficult + 1 WHERE room_id = v_room.id;
  ELSIF p_option_id = 'mixed' THEN
    UPDATE team_pulse_private.room_counts SET total = total + 1, mixed = mixed + 1 WHERE room_id = v_room.id;
  ELSIF p_option_id = 'good' THEN
    UPDATE team_pulse_private.room_counts SET total = total + 1, good = good + 1 WHERE room_id = v_room.id;
  ELSIF p_option_id = 'very-good' THEN
    UPDATE team_pulse_private.room_counts SET total = total + 1, very_good = very_good + 1 WHERE room_id = v_room.id;
  END IF;

  SELECT total INTO v_total FROM team_pulse_private.room_counts WHERE room_id = v_room.id;

  RETURN pg_catalog.jsonb_build_object('success', true, 'total', v_total);
END;
$$;
COMMENT ON FUNCTION public.tp_submit_vote(TEXT, TEXT, TEXT) IS 'team-pulse:v1';


-- Function 4: tp_get_facilitator_room_state (Requires valid admin secret hash)
CREATE OR REPLACE FUNCTION public.tp_get_facilitator_room_state(
  p_code TEXT,
  p_admin_secret_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_room team_pulse_private.rooms%ROWTYPE;
  v_counts team_pulse_private.room_counts%ROWTYPE;
  v_normalized_code TEXT;
BEGIN
  v_normalized_code := pg_catalog.upper(pg_catalog.btrim(p_code));

  SELECT * INTO v_room FROM team_pulse_private.rooms WHERE code = v_normalized_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF v_room.admin_secret_hash <> p_admin_secret_hash THEN
    RAISE EXCEPTION 'INVALID_ADMIN_SECRET';
  END IF;

  SELECT * INTO v_counts FROM team_pulse_private.room_counts WHERE room_id = v_room.id;

  RETURN pg_catalog.jsonb_build_object(
    'code', v_room.code,
    'status', v_room.status,
    'created_at', v_room.created_at,
    'expires_at', v_room.expires_at,
    'total', COALESCE(v_counts.total, 0),
    'counts', pg_catalog.jsonb_build_object(
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
COMMENT ON FUNCTION public.tp_get_facilitator_room_state(TEXT, TEXT) IS 'team-pulse:v1';


-- Function 5: tp_close_room
CREATE OR REPLACE FUNCTION public.tp_close_room(
  p_code TEXT,
  p_admin_secret_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_room team_pulse_private.rooms%ROWTYPE;
  v_normalized_code TEXT;
BEGIN
  v_normalized_code := pg_catalog.upper(pg_catalog.btrim(p_code));

  SELECT * INTO v_room FROM team_pulse_private.rooms WHERE code = v_normalized_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF v_room.admin_secret_hash <> p_admin_secret_hash THEN
    RAISE EXCEPTION 'INVALID_ADMIN_SECRET';
  END IF;

  UPDATE team_pulse_private.rooms SET status = 'closed' WHERE id = v_room.id;

  RETURN pg_catalog.jsonb_build_object('success', true);
END;
$$;
COMMENT ON FUNCTION public.tp_close_room(TEXT, TEXT) IS 'team-pulse:v1';


-- Function 6: tp_delete_room
CREATE OR REPLACE FUNCTION public.tp_delete_room(
  p_code TEXT,
  p_admin_secret_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_room team_pulse_private.rooms%ROWTYPE;
  v_normalized_code TEXT;
BEGIN
  v_normalized_code := pg_catalog.upper(pg_catalog.btrim(p_code));

  SELECT * INTO v_room FROM team_pulse_private.rooms WHERE code = v_normalized_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF v_room.admin_secret_hash <> p_admin_secret_hash THEN
    RAISE EXCEPTION 'INVALID_ADMIN_SECRET';
  END IF;

  DELETE FROM team_pulse_private.rooms WHERE id = v_room.id;

  RETURN pg_catalog.jsonb_build_object('success', true);
END;
$$;
COMMENT ON FUNCTION public.tp_delete_room(TEXT, TEXT) IS 'team-pulse:v1';


-- Private Cleanup Function in Private Schema (NOT exposed to public)
CREATE OR REPLACE FUNCTION team_pulse_private.cleanup_expired_rooms()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM team_pulse_private.rooms WHERE expires_at < pg_catalog.now() RETURNING id
  )
  SELECT pg_catalog.count(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;
COMMENT ON FUNCTION team_pulse_private.cleanup_expired_rooms() IS 'team-pulse:v1';


-- ----------------------------------------------------------------------------
-- 6. Precise Function Execution Grants & Revocations
-- ----------------------------------------------------------------------------

-- Revoke default PUBLIC execution on all Team Pulse functions
REVOKE ALL ON FUNCTION public.tp_create_room(TEXT, TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tp_get_public_room(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tp_submit_vote(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tp_get_facilitator_room_state(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tp_close_room(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tp_delete_room(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION team_pulse_private.cleanup_expired_rooms() FROM PUBLIC, anon, authenticated;

-- Grant execution ONLY to anon role for public tp_* RPCs
GRANT EXECUTE ON FUNCTION public.tp_create_room(TEXT, TEXT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.tp_get_public_room(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.tp_submit_vote(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.tp_get_facilitator_room_state(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.tp_close_room(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.tp_delete_room(TEXT, TEXT) TO anon;

COMMIT;
