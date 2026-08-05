-- ============================================================================
-- Team Pulse — Shared Supabase Preflight Inspection Script
-- ============================================================================
-- READ-ONLY INSPECTION. Does not alter, create, or drop any database object.
-- Execute this script in the Supabase SQL Editor before installing Team Pulse.
-- ============================================================================

DO $$
DECLARE
  v_private_schema_exists BOOLEAN;
  v_tp_create_room_exists BOOLEAN;
  v_tp_get_public_room_exists BOOLEAN;
  v_tp_submit_vote_exists BOOLEAN;
  v_tp_get_facilitator_state_exists BOOLEAN;
  v_tp_close_room_exists BOOLEAN;
  v_tp_delete_room_exists BOOLEAN;
  
  v_create_room_has_marker BOOLEAN := FALSE;
  v_schema_has_marker BOOLEAN := FALSE;

  v_uuid_available BOOLEAN;
  v_cron_available BOOLEAN;
  v_cron_job_exists BOOLEAN := FALSE;

  v_old_generic_rooms_exists BOOLEAN;
  v_old_generic_rpc_exists BOOLEAN;

  v_status TEXT := 'PASS';
  v_message TEXT := 'All preflight checks passed cleanly. Safe to run install-team-pulse.sql.';
BEGIN
  -- 1. Check Private Schema
  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'team_pulse_private'
  ) INTO v_private_schema_exists;

  IF v_private_schema_exists THEN
    SELECT (obj_description('team_pulse_private'::regnamespace, 'pg_namespace') LIKE '%team-pulse:v1%')
    INTO v_schema_has_marker;
  END IF;

  -- 2. Check tp_* Public RPC Functions
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'tp_create_room'
  ) INTO v_tp_create_room_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'tp_get_public_room'
  ) INTO v_tp_get_public_room_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'tp_submit_vote'
  ) INTO v_tp_submit_vote_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'tp_get_facilitator_room_state'
  ) INTO v_tp_get_facilitator_state_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'tp_close_room'
  ) INTO v_tp_close_room_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'tp_delete_room'
  ) INTO v_tp_delete_room_exists;

  IF v_tp_create_room_exists THEN
    SELECT (obj_description(p.oid, 'pg_proc') LIKE '%team-pulse:v1%')
    INTO v_create_room_has_marker
    FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'tp_create_room';
  END IF;

  -- 3. Check UUID Primitives
  SELECT (
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gen_random_uuid') OR
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uuid_generate_v4')
  ) INTO v_uuid_available;

  -- 4. Check Cron Job Name
  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron'
  ) INTO v_cron_available;

  IF v_cron_available THEN
    BEGIN
      EXECUTE 'SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = ''team-pulse-cleanup-v1'')' INTO v_cron_job_exists;
    EXCEPTION WHEN OTHERS THEN
      v_cron_job_exists := FALSE;
    END;
  END IF;

  -- 5. Check Old Generic Prototype Objects
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rooms'
  ) INTO v_old_generic_rooms_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'create_room'
  ) INTO v_old_generic_rpc_exists;

  -- Determine Preflight Status
  IF NOT v_uuid_available THEN
    v_status := 'BLOCKED';
    v_message := 'BLOCKED: No UUID generation primitive (gen_random_uuid or uuid_generate_v4) found.';
  ELSIF (v_private_schema_exists AND NOT v_schema_has_marker) OR (v_tp_create_room_exists AND NOT v_create_room_has_marker) THEN
    v_status := 'BLOCKED';
    v_message := 'BLOCKED: Existing object collision detected without team-pulse:v1 ownership marker.';
  ELSIF v_old_generic_rooms_exists OR v_old_generic_rpc_exists THEN
    v_status := 'REVIEW';
    v_message := 'REVIEW: Old generic prototype objects (public.rooms or public.create_room) detected from previous draft. Verify they do not belong to another application.';
  ELSIF v_tp_create_room_exists THEN
    v_status := 'REVIEW';
    v_message := 'REVIEW: Team Pulse v1 is already installed. Running install-team-pulse.sql will re-verify or update Team Pulse objects.';
  END IF;

  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'TEAM PULSE PREFLIGHT RESULT: %', v_status;
  RAISE NOTICE 'MESSAGE: %', v_message;
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Private Schema Exists: % (Has Marker: %)', v_private_schema_exists, v_schema_has_marker;
  RAISE NOTICE 'Public tp_create_room Exists: % (Has Marker: %)', v_tp_create_room_exists, v_create_room_has_marker;
  RAISE NOTICE 'Old Generic public.rooms Exists: %', v_old_generic_rooms_exists;
  RAISE NOTICE 'Cron Job team-pulse-cleanup-v1 Exists: %', v_cron_job_exists;
  RAISE NOTICE '=======================================================';
END;
$$;
