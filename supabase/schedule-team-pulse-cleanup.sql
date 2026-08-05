-- ============================================================================
-- Team Pulse — Optional Hourly Cleanup Cron Scheduling Script
-- ============================================================================
-- Job Name: team-pulse-cleanup-v1
-- Schedules team_pulse_private.cleanup_expired_rooms() to run every hour.
-- Idempotent and safe for shared Supabase projects using pg_cron.
-- Uses distinct named dollar-quote tags ($do$, $chk$, $sched$, $cron$).
-- ============================================================================

DO $do$
DECLARE
  v_cron_available BOOLEAN;
  v_job_exists BOOLEAN := FALSE;
BEGIN
  -- Check if cron schema exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron'
  ) INTO v_cron_available;

  IF NOT v_cron_available THEN
    RAISE NOTICE '[NOTICE] pg_cron extension is not enabled in this database. Automatic cleanup scheduling skipped.';
    RETURN;
  END IF;

  -- Check if exact job already exists
  BEGIN
    EXECUTE $chk$ SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'team-pulse-cleanup-v1') $chk$ INTO v_job_exists;
  EXCEPTION WHEN OTHERS THEN
    v_job_exists := FALSE;
  END;

  IF v_job_exists THEN
    RAISE NOTICE '[NOTICE] Cron job team-pulse-cleanup-v1 is already scheduled.';
  ELSE
    EXECUTE $sched$ SELECT cron.schedule('team-pulse-cleanup-v1', '0 * * * *', $cron$ SELECT team_pulse_private.cleanup_expired_rooms(); $cron$) $sched$;
    RAISE NOTICE '[SUCCESS] Scheduled hourly cron job team-pulse-cleanup-v1.';
  END IF;
END;
$do$;
