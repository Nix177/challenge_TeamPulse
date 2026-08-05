# Project Brief — Team Pulse

Tagline: “Prendre le pouls. Ouvrir la conversation.”

## Product Overview
Team Pulse is a private, multi-device web application for synchronous team workshops. Participants join a temporary session from their own smartphone or computer using a short room code. Individual choices remain strictly anonymous and are aggregated only for group conversation.

The application supports two distinct roles:

### 1. Facilitator Role
- Creates a temporary session (defaults to 12 hours max expiration).
- Receives a generated 6-character room code (e.g. `K7M4PQ`).
- Receives a high-entropy administration secret kept **only in the URL hash fragment** (`#admin=<secret>`).
- Shares the room code or participant link (`?room=K7M4PQ`) with team members.
- Sees the live total number of submitted responses (polled every ~5s).
- Closes submissions when the group has finished responding.
- Reveals the aggregate distribution curve and discussion question.
- Deletes the session permanently when completed.

### 2. Participant Role
- Opens Team Pulse on their own device and enters the room code or follows a participant link (`?room=K7M4PQ`).
- Submits exactly one response.
- Receives a clear receipt ("Réponse enregistrée. Elle a bien été ajoutée à la session K7M4PQ...") and closes the page.
- Never sees previous participant responses or individual choices.
- Cannot view aggregate results or facilitator controls.

## Security & Access Model
- **Participant Room Code**: 6-character uppercase string of unambiguous alphanumeric characters (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`). Allows joining and submitting 1 vote.
- **Facilitator Secret**: Web Crypto random 32-character hex secret stored ONLY in URL fragment (`#admin=<secret>`). Never transmitted in plain text to the server. The frontend computes its SHA-256 hash (`admin_secret_hash`) for database RPC authentication.
- **Participant Link Protection**: Participant share links contain only the room code (`?room=K7M4PQ`) and **never** include the admin secret.
- **Non-Identifying Participant Token**: Web Crypto random token stored strictly in `sessionStorage` (scoped to room). Sends SHA-256 hash to backend (`submit_room_vote`) to prevent accidental duplicate submission in the same browser session.

## Canonical Options (Exact Order)
1. `very-difficult` — Label: “Très difficile” — Text: “J’aurais besoin de soutien.”
2. `difficult` — Label: “Difficile” — Text: “Quelque chose me freine.”
3. `mixed` — Label: “Mitigé” — Text: “Il y a du bon et du moins bon.”
4. `good` — Label: “Bien” — Text: “Je me sens plutôt bien.”
5. `very-good` — Label: “Très bien” — Text: “J’arrive avec beaucoup d’énergie.”

## Deterministic Observation Rules
- `negativeShare` = (`very-difficult` + `difficult`) / total
- `positiveShare` = (`good` + `very-good`) / total

Rules (in exact priority order):
1. **Rule 1 — support**: `negativeShare >= 0.5`
2. **Rule 2 — contrast**: `negativeShare >= 0.25 && positiveShare >= 0.25`
3. **Rule 3 — preserve**: `positiveShare >= 0.55`
4. **Rule 4 — small improvement**: Fallback

## URL Modes
- Normal mode: Multi-device sessions via Supabase backend.
- `?demo=1`: Local demo mode simulating session creation, participant submission, and aggregate reveal without contacting any backend.
