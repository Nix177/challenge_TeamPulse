# Shared Supabase Project Session Architecture — Team Pulse

This document specifies the shared Supabase project isolation, database security model, and API client architecture for **Team Pulse**.

---

## 1. High-Level Architecture & Shared Project Boundaries

Team Pulse operates inside an existing, shared Supabase project without interfering with any other hosted application.

```
+------------------+             +----------------------------------+             +------------------------+
| Participant App  |             |      Shared Supabase Database    |             | Facilitator Dashboard  |
| (Individual Dev) |             |  (team_pulse_private + tp_* RPC) |             |  (Facilitator Device)  |
+------------------+             +----------------------------------+             +------------------------+
         |                                        |                                           |
         | 1. tp_get_public_room(K7M4PQ)          |                                           |
         |--------------------------------------->| (Returns code, status, total ONLY)        |
         | 2. tp_submit_vote(K7M4PQ, opt, token)  |                                           |
         |--------------------------------------->| 3. Atomically Increments Counter & Token  |
         |                                        |------------------------------------------>| 4. Live Total (5s Poll)
         |                                        |                                           | (No option breakdown)
         |                                        | 5. tp_close_room / tp_get_facilitator...  |
         |                                        |<------------------------------------------| (Valid Admin Secret Hash)
         |                                        | 6. Reveal Distribution & Observations     |
         |                                        |------------------------------------------>|
```

---

## 2. Shared Project Database Namespace & Ownership Markers

- **Private Schema**: `team_pulse_private`
  - Internal tables: `team_pulse_private.rooms`, `team_pulse_private.room_counts`, `team_pulse_private.participants`.
  - Direct access `REVOKED` from `PUBLIC`, `anon`, and `authenticated` roles. Not exposed in Supabase Data API.
- **Public RPC Functions**:
  - `public.tp_create_room`
  - `public.tp_get_public_room`
  - `public.tp_submit_vote`
  - `public.tp_get_facilitator_room_state`
  - `public.tp_close_room`
  - `public.tp_delete_room`
  - All RPCs defined with `SECURITY DEFINER` and `SET search_path = ''`.
- **Ownership Marker**: Every Team Pulse schema, table, and function carries database comment `'team-pulse:v1'`.

---

## 3. Client API & Key Handling

- **Publishable Key**: `SUPABASE_CONFIG.supabasePublishableKey` (supports `sb_publishable_` format).
- **HTTP Header**: Sent ONLY in `apikey` header. No `Authorization: Bearer` header or service-role secret key.
- **Unconfigured Handling**: In normal mode, if Supabase credentials are placeholder values, Team Pulse renders a clear development configuration view (`renderUnconfiguredView()`) rather than silently using a local mock. `?demo=1` mode continues to use the local mock.
