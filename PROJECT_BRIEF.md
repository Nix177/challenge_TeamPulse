# Project Brief — Team Pulse

## Primary Use Case: 30-Second Collective Check-in
Team Pulse is designed for one single primary use case: a 30-second collective check-in at the beginning of a meeting, workshop, class, or team session.

The facilitator uses Team Pulse immediately **before starting the main activity**:
- To see how the group arrives;
- To acknowledge different states of energy and availability;
- To decide whether the group needs a brief adjustment before starting;
- To open a short human conversation when useful.

**What Team Pulse is NOT**:
- NOT an end-of-session feedback survey;
- NOT a satisfaction questionnaire;
- NOT a performance assessment or mental health diagnostic;
- NOT an automated evaluation of the team.

---

## Active Real Supabase Integration Status
- **Backend URL**: `https://qsfcfqstvmmyqchlrkhk.supabase.co`
- **Publishable Key**: `sb_publishable_yPlrdLevpZxNkpQxMG3qxA_MWIjF0zA`
- **Active Hourly Cleanup Cron Job**:
  - Name: `team-pulse-cleanup-v1`
  - Schedule: `0 * * * *`
  - Command: `SELECT team_pulse_private.cleanup_expired_rooms();`

---

## Product Roles & UX Sequence
- **Facilitator**: Creates session directly from landing page $\rightarrow$ Shares code (`K7M4PQ`) or participant link $\rightarrow$ Monitors live response counter $\rightarrow$ Clicks `Afficher les résultats` (with small-group confirmation dialog if $<3$ responses) $\rightarrow$ Displays 100% stacked bar distribution and fixed facilitation prompt (*« De quoi avons-nous besoin pour bien commencer cette session ? »*) $\rightarrow$ Creates new session or deletes room.
- **Participant**: Joins via code or link $\rightarrow$ Answers single question (*« Comment vous sentez-vous en ce début de session ? »*) $\rightarrow$ Clicks `Envoyer ma réponse` $\rightarrow$ Sees receipt and waiting message $\rightarrow$ Receives revealed 100% stacked results automatically when facilitator reveals.

---

## Privacy & Security Bounds
- **Private Schema**: `team_pulse_private` (unexposed to REST Data API, direct table access denied).
- **Public RPCs**: `tp_create_room`, `tp_get_public_room`, `tp_submit_vote`, `tp_get_facilitator_room_state`, `tp_close_room`, `tp_delete_room` (`SECURITY DEFINER` with `SET search_path = ''` and `Content-Profile: public`).
- **Category Secrecy**: While open, `tp_get_public_room` returns total count ONLY. Once closed/revealed, returns aggregate category counts.
- **Client Auth**: `apikey` header ONLY with `supabasePublishableKey`. Zero `service_role` keys or `Authorization: Bearer` headers.
