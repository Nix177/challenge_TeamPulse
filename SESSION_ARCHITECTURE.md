# Session Architecture & Privacy Specification — Team Pulse

This document specifies the transition of **Team Pulse** from a single shared-device prototype into a private, multi-device session application using a Supabase backend and Web Crypto security.

---

## 1. High-Level Architecture Overview

Team Pulse enables synchronous, multi-device team workshops while maintaining absolute privacy for individual responses.

```
+------------------+          +-------------------------+          +------------------------+
| Participant App  |          |     Supabase RPC        |          | Facilitator Dashboard  |
| (Individual Dev) |          | (PostgreSQL + RLS + RPC)|          |  (Facilitator Device)  |
+------------------+          +-------------------------+          +------------------------+
         |                                 |                                    |
         | 1. Join Room (Room Code)        |                                    |
         |-------------------------------->|                                    |
         | 2. Submit Vote (SHA-256 Token)  |                                    |
         |-------------------------------->| 3. Increment Counter & Log Token   |
         |                                 |----------------------------------->| 4. Live Total Count (5s Poll)
         |                                 |                                    | (No individual choices)
         |                                 | 5. Close Room & Request Aggregates |
         |                                 |<-----------------------------------| (Valid Admin Secret Hash)
         |                                 | 6. Reveal Distribution & Prompt    |
         |                                 |----------------------------------->|
```

---

## 2. Access Credentials & URL Security

### A. Participant Room Code
- **Format**: 6-character uppercase string using unambiguous alphanumeric characters (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`).
- **Example**: `K7M4PQ`
- **Scope**: Identifies the room for participants to join and submit a single response.
- **Privacy Bound**: The room code **never** permits reading aggregate results, viewing individual responses, closing the session, or performing facilitator actions.

### B. Facilitator Administration Secret
- **Format**: High-entropy cryptographically random string generated in the browser via `crypto.getRandomValues()`.
- **Location**: Stored **only in the URL hash fragment**: `http://localhost:4173/#admin=<secret>`
- **Security Rule**: The URL hash fragment (`#admin=...`) is processed purely on the client side and is **never sent in HTTP headers or URLs to the server**.
- **Backend Hashing**: The frontend computes the **SHA-256 hash** of the administration secret (`crypto.subtle.digest`) before transmitting it to database RPC functions (`admin_secret_hash`).
- **Participant Link Protection**: Participant share links contain only the room code (`?room=K7M4PQ`) and **never** include the admin secret.

---

## 3. Database Schema & RLS Security

The database design strictly separates participant submission metadata from response counters.

### Entities (`supabase/schema.sql`)
1. **`rooms`**:
   - `id`: UUID (Primary Key)
   - `code`: TEXT (Unique, uppercase normalized 6-char code)
   - `admin_secret_hash`: TEXT (SHA-256 hash of facilitator secret)
   - `status`: TEXT (`'open'` | `'closed'`)
   - `created_at`: TIMESTAMPTZ (Default `now()`)
   - `expires_at`: TIMESTAMPTZ (Default `now() + interval '12 hours'`)

2. **`room_counts`**:
   - `room_id`: UUID (Primary Key, Foreign Key -> `rooms.id` ON DELETE CASCADE)
   - `total`: INTEGER (Total votes count)
   - `very_difficult`: INTEGER
   - `difficult`: INTEGER
   - `mixed`: INTEGER
   - `good`: INTEGER
   - `very_good`: INTEGER

3. **`room_participants`**:
   - `id`: UUID (Primary Key)
   - `room_id`: UUID (Foreign Key -> `rooms.id` ON DELETE CASCADE)
   - `participant_token_hash`: TEXT (SHA-256 hash of non-identifying browser token)
   - `submitted_at`: TIMESTAMPTZ (Default `now()`)
   - **Constraint**: `UNIQUE (room_id, participant_token_hash)`

> **CRITICAL PRIVACY GUARANTEE**: `room_participants` records ONLY that a token hash has submitted a vote. It DOES NOT contain the selected option. It is mathematically impossible to link a participant token to their selected option.

---

## 4. SECURITY DEFINER RPC Functions & Row Level Security

Direct SELECT, INSERT, UPDATE, and DELETE privileges on all tables are **REVOKED** from the `anon` role. All client interactions occur through strict `SECURITY DEFINER` stored procedures:

- `create_room(p_code, p_admin_secret_hash, p_duration_hours)`
- `get_public_room(p_code)` — Returns room status and total count; does **not** return aggregate option breakdown.
- `submit_room_vote(p_code, p_option_id, p_participant_token_hash)` — Verifies room status is `'open'` and not expired, inserts token hash into `room_participants` (preventing duplicates), and atomically increments the corresponding column in `room_counts`.
- `get_facilitator_room_state(p_code, p_admin_secret_hash)` — Verifies the SHA-256 hash of the admin secret before returning detailed aggregate option counts.
- `close_room(p_code, p_admin_secret_hash)` — Closes the room for new submissions.
- `delete_room(p_code, p_admin_secret_hash)` — Deletes the room and cascades deletion to counts and participants.
- `cleanup_expired_rooms()` — Deletes rooms where `expires_at < now()`.

---

## 5. Non-Identifying Participant Token

- Generated in the browser via `crypto.getRandomValues()`.
- Saved strictly in `sessionStorage` scoped to the current room.
- Only its SHA-256 hash is transmitted to `submit_room_vote`.
- Prevents accidental duplicate submissions from the same browser session. Clearing storage or switching browsers bypasses this MVP protection (which is explicitly documented).

---

## 6. Expiration & Deletion Lifecycle

- Sessions default to **12 hours** expiration.
- Facilitator view displays a countdown timer.
- Expired sessions reject new votes and return an expired error status.
- Session deletion permanently removes room metadata, counters, and participant token hashes.
