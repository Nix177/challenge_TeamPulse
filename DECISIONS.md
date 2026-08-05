# Architectural & Design Decisions — Team Pulse

## Decision 1: Shared Supabase Project Isolation (`team_pulse_private` Schema & `tp_*` RPCs)
- **Rationale**: Isolates all Team Pulse tables inside `team_pulse_private` schema without exposing them to Supabase Data API or granting direct table privileges. Public interface exposes ONLY 6 `SECURITY DEFINER` RPC stored procedures prefixed with `tp_` (`SET search_path = ''`).
- **Collision Protection**: Every Team Pulse object carries database comment `'team-pulse:v1'`.

## Decision 2: Web Crypto Admin Secret & Hash Authentication
- **Rationale**: Facilitator URL fragment (`#admin=<secret>`) contains a Web Crypto random secret processed client-side only. The frontend computes its SHA-256 hash (`admin_secret_hash`) for database RPC authentication. Participant links contain only room code (`?room=K7M4PQ`).

## Decision 3: Client Key Handling & Header Security
- **Rationale**: Uses `supabasePublishableKey` (supporting `sb_publishable_` format). Sent ONLY in `apikey` HTTP header for REST RPC calls. No `Authorization: Bearer` header or service-role key.

## Decision 4: Explicit Unconfigured Handling
- **Rationale**: Normal mode renders a clear development configuration screen when credentials are missing, avoiding silent fallback to local mock. `?demo=1` mode continues to use local mock.
