# Project Brief — Team Pulse

Tagline: “Prendre le pouls. Ouvrir la conversation.”

## Product Overview
Team Pulse is a private, multi-device web application for synchronous team workshops. Participants join a temporary session from their own smartphone or computer using a short 6-character room code. Individual choices remain strictly anonymous and are aggregated only for group conversation.

Connected directly to the real shared Supabase project (`https://qsfcfqstvmmyqchlrkhk.supabase.co`) using the isolated `team_pulse_private` schema and prefixed `public.tp_*` RPC procedures.

## Active Real Supabase Integration Status
- **Backend URL**: `https://qsfcfqstvmmyqchlrkhk.supabase.co`
- **Publishable Key**: `sb_publishable_yPlrdLevpZxNkpQxMG3qxA_MWIjF0zA`
- **Active Hourly Cleanup Cron Job**:
  - Name: `team-pulse-cleanup-v1`
  - Schedule: `0 * * * *`
  - Active: `true`
  - Command: `SELECT team_pulse_private.cleanup_expired_rooms();`

## Product Roles
- **Facilitator**: Creates session, receives 6-character room code (`K7M4PQ`) and admin secret in URL fragment (`#admin=<secret>`), shares room code or link (`?room=K7M4PQ`), monitors response counter (5s poll), closes room, reveals aggregate distribution curve, and deletes session.
- **Participant**: Joins via room code or link, submits 1 vote, receives confirmation receipt, and closes page. Never sees individual responses or facilitator controls.

## Privacy & Shared Supabase Bounds
- **Private Schema**: `team_pulse_private` (unexposed to Data API, RLS enabled, direct table access denied).
- **Public RPCs**: `tp_create_room`, `tp_get_public_room`, `tp_submit_vote`, `tp_get_facilitator_room_state`, `tp_close_room`, `tp_delete_room` (`SECURITY DEFINER` with `SET search_path = ''`).
- **Ownership Marker**: `'team-pulse:v1'` on all created objects for collision protection.
- **Client Auth**: `apikey` header ONLY with `supabasePublishableKey`. Zero `service_role` keys or `Authorization: Bearer` headers.
- **Unconfigured Mode**: Renders a clear configuration notice when credentials are missing in normal mode. `?demo=1` operates 100% locally.
