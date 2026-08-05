# Shared Supabase Backend Installation & Security Guide — Team Pulse

This guide explains how to inspect, install, verify, and maintain Team Pulse inside an existing, shared Supabase project without affecting any other hosted application.

---

## 1. Security & Namespace Isolation Architecture

- **Unexposed Private Schema**: All internal tables (`rooms`, `room_counts`, `participants`) are created inside the private schema `team_pulse_private`.
- **Zero Direct Table Access**: Direct `SELECT`, `INSERT`, `UPDATE`, and `DELETE` access to all tables is **REVOKED** from `PUBLIC`, `anon`, and `authenticated` roles. `team_pulse_private` is not added to exposed Data API schemas.
- **Prefixed Public RPC Functions**: Browser interactions occur exclusively via 6 `SECURITY DEFINER` RPC stored procedures prefixed with `tp_` in `public` with `SET search_path = ''`:
  - `public.tp_create_room`
  - `public.tp_get_public_room`
  - `public.tp_submit_vote`
  - `public.tp_get_facilitator_room_state`
  - `public.tp_close_room`
  - `public.tp_delete_room`
- **Ownership Marker Protection**: Every Team Pulse schema, table, and RPC function is tagged with database comment `'team-pulse:v1'` for collision detection.
- **Publishable Key Client Authentication**: Frontend API calls send the public publishable key ONLY in the `apikey` HTTP header. No `Authorization: Bearer` header or service-role secret key is used.

---

## 2. SQL Deliverables & Execution Order

Run the following scripts in the Supabase SQL Editor in exact numerical sequence:

### Step 1: Preflight Inspection (Read-Only)
Run [`supabase/preflight-team-pulse.sql`](file:///e:/challenge%20huumyk/supabase/preflight-team-pulse.sql).
- Inspects schema collisions, ownership markers, UUID primitives, and existing functions.
- Must return `PASS` before proceeding.

### Step 2: Main Installation
Run [`supabase/install-team-pulse.sql`](file:///e:/challenge%20huumyk/supabase/install-team-pulse.sql).
- Creates `team_pulse_private` schema, 3 private tables, RLS policies, 6 public `tp_*` RPCs, 1 private cleanup RPC, and function grants for `anon`.
- Wrapped in a transaction; aborts cleanly on unexpected collision.

### Step 3: Verification Script
Run [`supabase/verify-team-pulse.sql`](file:///e:/challenge%20huumyk/supabase/verify-team-pulse.sql).
- Verifies schema, RLS, function grants, and performs a complete simulated room lifecycle (create, public query, vote submission, duplicate token rejection, invalid secret rejection, delete).
- Leaves ZERO residual test sessions behind.

### Step 4 (Optional): Schedule Hourly Cleanup
Run [`supabase/schedule-team-pulse-cleanup.sql`](file:///e:/challenge%20huumyk/supabase/schedule-team-pulse-cleanup.sql).
- Schedules `team_pulse_private.cleanup_expired_rooms()` hourly via `pg_cron` under job name `team-pulse-cleanup-v1`.

### Teardown / Removal Script (If Ever Needed)
Run [`supabase/remove-team-pulse.sql`](file:///e:/challenge%20huumyk/supabase/remove-team-pulse.sql).
- Precisely removes ONLY Team Pulse objects tagged with `'team-pulse:v1'`.

---

## 3. Frontend Configuration

Update `src/config.js` with your public Supabase project credentials:
```javascript
export const SUPABASE_CONFIG = Object.freeze({
  supabaseUrl: 'https://xyzcompany.supabase.co',
  supabasePublishableKey: 'sb_publishable_your_key_here',
});
```
