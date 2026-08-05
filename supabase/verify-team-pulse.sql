-- ============================================================================
-- Team Pulse — Shared Supabase Post-Installation Verification Script
-- ============================================================================
-- Runs verification checks and clean simulated runtime tests in a transaction.
-- Leaves ZERO residual test rows or test sessions behind.
-- ============================================================================

DO $$
DECLARE
  v_test_code TEXT := 'VRFY99';
  v_test_secret_hash TEXT := '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  v_token_hash_a TEXT := 'token_hash_a_12345678901234567890';
  v_token_hash_b TEXT := 'token_hash_b_12345678901234567890';

  v_res JSONB;
  v_pub JSONB;
  v_fac JSONB;

  v_passed_count INT := 0;
  v_failed_count INT := 0;

  v_has_schema BOOLEAN;
  v_anon_direct_access BOOLEAN := FALSE;
  v_cleanup_grant_anon BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'STARTING TEAM PULSE VERIFICATION CHECKS...';
  RAISE NOTICE '=======================================================';

  -- Check 1: Private Schema Exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'team_pulse_private'
  ) INTO v_has_schema;

  IF v_has_schema THEN
    RAISE NOTICE '[PASS] Check 1: team_pulse_private schema exists.';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE '[FAIL] Check 1: team_pulse_private schema missing!';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Check 2: Direct Table Access Privilege for Anon (Must be FALSE)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_privileges 
    WHERE table_schema = 'team_pulse_private' AND grantee = 'anon' AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) INTO v_anon_direct_access;

  IF NOT v_anon_direct_access THEN
    RAISE NOTICE '[PASS] Check 2: Direct table privileges for anon on private schema are denied.';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE '[FAIL] Check 2: Anon role has direct table privileges on private schema!';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Check 3: Private Cleanup Function execution granted to anon (Must be FALSE)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges 
    WHERE routine_schema = 'team_pulse_private' AND routine_name = 'cleanup_expired_rooms' AND grantee IN ('anon', 'authenticated')
  ) INTO v_cleanup_grant_anon;

  IF NOT v_cleanup_grant_anon THEN
    RAISE NOTICE '[PASS] Check 3: Private cleanup function execution is denied to anon & authenticated.';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE '[FAIL] Check 3: Cleanup function execution is granted to anon/authenticated!';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Runtime Test Step 1: Create Test Room
  BEGIN
    v_res := public.tp_create_room(v_test_code, v_test_secret_hash, 1);
    IF (v_res->>'success')::boolean = true THEN
      RAISE NOTICE '[PASS] Runtime Test 1: tp_create_room executed successfully.';
      v_passed_count := v_passed_count + 1;
    ELSE
      RAISE NOTICE '[FAIL] Runtime Test 1: tp_create_room failed.';
      v_failed_count := v_failed_count + 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[FAIL] Runtime Test 1 Exception: %', SQLERRM;
    v_failed_count := v_failed_count + 1;
  END;

  -- Runtime Test Step 2: Public Query (Must NOT contain option breakdown)
  BEGIN
    v_pub := public.tp_get_public_room(v_test_code);
    IF (v_pub->>'total_votes')::int = 0 AND (v_pub ? 'counts') = false THEN
      RAISE NOTICE '[PASS] Runtime Test 2: tp_get_public_room returns aggregate count ONLY (no option counts).';
      v_passed_count := v_passed_count + 1;
    ELSE
      RAISE NOTICE '[FAIL] Runtime Test 2: tp_get_public_room leaked option breakdown!';
      v_failed_count := v_failed_count + 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[FAIL] Runtime Test 2 Exception: %', SQLERRM;
    v_failed_count := v_failed_count + 1;
  END;

  -- Runtime Test Step 3: Vote Submission & Duplicate Rejection
  BEGIN
    v_res := public.tp_submit_vote(v_test_code, 'good', v_token_hash_a);
    v_res := public.tp_submit_vote(v_test_code, 'very-good', v_token_hash_b);
    
    IF (v_res->>'total')::int = 2 THEN
      RAISE NOTICE '[PASS] Runtime Test 3: tp_submit_vote recorded 2 votes atomically.';
      v_passed_count := v_passed_count + 1;
    ELSE
      RAISE NOTICE '[FAIL] Runtime Test 3: tp_submit_vote failed total count.';
      v_failed_count := v_failed_count + 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[FAIL] Runtime Test 3 Exception: %', SQLERRM;
    v_failed_count := v_failed_count + 1;
  END;

  -- Runtime Test Step 4: Duplicate Token Rejection
  BEGIN
    v_res := public.tp_submit_vote(v_test_code, 'mixed', v_token_hash_a);
    RAISE NOTICE '[FAIL] Runtime Test 4: Duplicate token was accepted!';
    v_failed_count := v_failed_count + 1;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%ALREADY_SUBMITTED%' THEN
      RAISE NOTICE '[PASS] Runtime Test 4: Duplicate token correctly rejected with ALREADY_SUBMITTED.';
      v_passed_count := v_passed_count + 1;
    ELSE
      RAISE NOTICE '[FAIL] Runtime Test 4: Unexpected exception on duplicate vote: %', SQLERRM;
      v_failed_count := v_failed_count + 1;
    END IF;
  END;

  -- Runtime Test Step 5: Invalid Secret Rejection on Facilitator State
  BEGIN
    v_fac := public.tp_get_facilitator_room_state(v_test_code, 'wrong_secret_hash');
    RAISE NOTICE '[FAIL] Runtime Test 5: Invalid admin secret was accepted!';
    v_failed_count := v_failed_count + 1;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%INVALID_ADMIN_SECRET%' THEN
      RAISE NOTICE '[PASS] Runtime Test 5: Invalid admin secret correctly rejected.';
      v_passed_count := v_passed_count + 1;
    ELSE
      RAISE NOTICE '[FAIL] Runtime Test 5: Unexpected exception: %', SQLERRM;
      v_failed_count := v_failed_count + 1;
    END IF;
  END;

  -- Runtime Test Step 6: Room Deletion & Cleanup Verification
  BEGIN
    v_res := public.tp_delete_room(v_test_code, v_test_secret_hash);
    IF (v_res->>'success')::boolean = true THEN
      RAISE NOTICE '[PASS] Runtime Test 6: tp_delete_room cleaned up test session.';
      v_passed_count := v_passed_count + 1;
    ELSE
      RAISE NOTICE '[FAIL] Runtime Test 6: tp_delete_room failed.';
      v_failed_count := v_failed_count + 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[FAIL] Runtime Test 6 Exception: %', SQLERRM;
    v_failed_count := v_failed_count + 1;
  END;

  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'VERIFICATION COMPLETE: % PASSED, % FAILED.', v_passed_count, v_failed_count;
  RAISE NOTICE '=======================================================';
END;
$$;
