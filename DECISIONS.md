# Architectural & Design Decisions — Team Pulse

## Decision 1: Shared Supabase Project Isolation (`team_pulse_private` Schema & `tp_*` RPCs)
- **Rationale**: Isolates all Team Pulse tables inside `team_pulse_private` schema without exposing them to Supabase Data API or granting direct table privileges. Public interface exposes ONLY 6 `SECURITY DEFINER` RPC stored procedures prefixed with `tp_` (`SET search_path = ''`).
- **Collision Protection**: Every Team Pulse object carries database comment `'team-pulse:v1'`.

## Decision 2: Web Crypto Admin Secret & Hash Authentication
- **Rationale**: Facilitator URL fragment (`#admin=<secret>`) contains a Web Crypto random secret processed client-side only. The frontend computes its SHA-256 hash (`admin_secret_hash`) for database RPC authentication. Participant links contain only room code (`?room=K7M4PQ`).

## Decision 3: Client Key Handling & Header Security
- **Rationale**: Uses `supabasePublishableKey` (`sb_publishable_yPlrdLevpZxNkpQxMG3qxA_MWIjF0zA`). Sent ONLY in `apikey` HTTP header for REST RPC calls to `https://qsfcfqstvmmyqchlrkhk.supabase.co`. No `Authorization: Bearer` header or service-role key is used.

## Decision 4: Real Active Hourly Cleanup Cron Job
- **Rationale**: The cron job `team-pulse-cleanup-v1` runs hourly (`0 * * * *`) via `pg_cron` in the shared database, executing `SELECT team_pulse_private.cleanup_expired_rooms();` to physically purge expired sessions.

## Decision 5: Participant Receipt Hiding Selected Choice
- **Rationale**: To prevent accidental disclosure or screen-peeking, the participant submission receipt displays ONLY the confirmation message, session code, privacy reassurance, and closing instruction. It never re-displays the selected choice or option color.
