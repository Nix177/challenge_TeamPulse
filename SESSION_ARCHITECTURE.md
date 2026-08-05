# Shared Supabase Project Session Architecture — Team Pulse

This document specifies the shared Supabase project isolation, database security model, active cron job status, and API client architecture for **Team Pulse**.

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

## 2. Active Shared Supabase Integration Status

- **Project Origin**: `https://qsfcfqstvmmyqchlrkhk.supabase.co`
- **Publishable Key**: `sb_publishable_yPlrdLevpZxNkpQxMG3qxA_MWIjF0zA`
- **Private Schema**: `team_pulse_private` (unexposed to Data API)
- **Public RPCs**: `tp_create_room`, `tp_get_public_room`, `tp_submit_vote`, `tp_get_facilitator_room_state`, `tp_close_room`, `tp_delete_room` (`SECURITY DEFINER`, `search_path = ''`)
- **Active Cron Job**:
  - Name: `team-pulse-cleanup-v1`
  - Schedule: `0 * * * *`
  - Active: `true`
  - Command: `SELECT team_pulse_private.cleanup_expired_rooms();`

---

## 3. Client API & Key Handling

- **Publishable Key**: `SUPABASE_CONFIG.supabasePublishableKey`.
- **HTTP Header**: Sent ONLY in `apikey` header. No `Authorization: Bearer` header or service-role secret key.
- **Unconfigured Handling**: In normal mode, if Supabase credentials are placeholder values, Team Pulse renders a clear development configuration view (`renderUnconfiguredView()`). `?demo=1` mode operates 100% locally.
