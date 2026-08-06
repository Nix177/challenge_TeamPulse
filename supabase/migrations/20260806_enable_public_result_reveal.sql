-- ============================================================================
-- Team Pulse — Migration: Enable Public Revealed Results in tp_get_public_room
-- ============================================================================
-- When a room is open: tp_get_public_room returns code, status, total_votes (NO counts).
-- When a room is closed: tp_get_public_room returns code, status, total_votes AND aggregated counts.
-- Does NOT expose admin secrets, hashes, participant tokens, or individual choices.
-- ============================================================================

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
