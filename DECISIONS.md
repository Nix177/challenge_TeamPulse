# Architectural & Design Decisions — Team Pulse

## Decision 1: Private Multi-Device Sessions with Web Crypto Admin Secret
- **Rationale**: Transition from shared-device handoff to multi-device sessions where participants join from their own devices via 6-character room code (`K7M4PQ`).
- **Security Rule**: The facilitator URL fragment (`#admin=<secret>`) contains a Web Crypto random secret that is processed client-side only and never sent to the server. The frontend computes its SHA-256 hash (`admin_secret_hash`) for database RPC procedures. Participant links contain only the room code (`?room=K7M4PQ`) and NEVER include the admin secret.

## Decision 2: Supabase SECURITY DEFINER RPC Procedures & RLS
- **Rationale**: All direct table access (`rooms`, `room_counts`, `room_participants`) is REVOKED for anonymous users. Client operations occur strictly via `SECURITY DEFINER` stored procedures (`create_room`, `get_public_room`, `submit_room_vote`, `get_facilitator_room_state`, `close_room`, `delete_room`, `cleanup_expired_rooms`).
- **Privacy Bound**: `get_public_room` returns status and total count only. Aggregates are returned ONLY to `get_facilitator_room_state` when presented with a valid admin secret hash.

## Decision 3: Non-Identifying Participant Token
- **Rationale**: Prevents accidental duplicate submissions from the same browser session. Web Crypto generates a random token stored in `sessionStorage` (scoped to room). Only its SHA-256 hash is transmitted to `submit_room_vote`. The database stores the token hash in `room_participants` without any option association.

## Decision 4: Expiration & Cleanup Lifecycle
- **Rationale**: Sessions default to 12 hours max duration. Expired rooms reject new votes. `cleanup_expired_rooms()` permanently deletes expired room records, counts, and participant token hashes.
