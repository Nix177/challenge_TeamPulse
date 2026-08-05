-- ============================================================================
-- Team Pulse — Shared Supabase Precise Teardown & Removal Script
-- ============================================================================
-- Removes ONLY Team Pulse objects marked with comment 'team-pulse:v1'.
-- Leaves all other schemas, tables, functions, and cron jobs untouched.
-- ============================================================================

BEGIN;

-- 1. Unschedule Cron Job (if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron') THEN
    EXECUTE 'SELECT cron.unschedule(''team-pulse-cleanup-v1'') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = ''team-pulse-cleanup-v1'')';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if cron schema is unavailable
END;
$$;

-- 2. Drop Public RPC Functions (Only if owned by team-pulse:v1)
DO $$
DECLARE
  v_rpc RECORD;
BEGIN
  FOR v_rpc IN
    SELECT p.oid, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) as args
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname LIKE 'tp\_%' ESCAPE '\'
  LOOP
    IF pg_catalog.obj_description(v_rpc.oid, 'pg_proc') LIKE '%team-pulse:v1%' THEN
      EXECUTE pg_catalog.format('DROP FUNCTION IF EXISTS public.%I(%s)', v_rpc.proname, v_rpc.args);
    END IF;
  END LOOP;
END;
$$;

-- 3. Drop Private Schema and Private Objects (Only if owned by team-pulse:v1)
DO $$
DECLARE
  v_schema_marker BOOLEAN := FALSE;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'team_pulse_private') THEN
    SELECT (pg_catalog.obj_description('team_pulse_private'::regnamespace, 'pg_namespace') LIKE '%team-pulse:v1%')
    INTO v_schema_marker;

    IF v_schema_marker THEN
      DROP SCHEMA team_pulse_private CASCADE;
    ELSE
      RAISE EXCEPTION 'REMOVAL_ABORTED: Schema team_pulse_private exists but lacks team-pulse:v1 ownership marker!';
    END IF;
  END IF;
END;
$$;

COMMIT;
