# Human Clarity & Privacy Audit — Team Pulse

This audit documents the visual, functional, and privacy clarity verified in the multi-device session architecture.

---

## 1. Multi-Device Participant Flow & Privacy
- **Clear Room Entry**: Participants land on a clean, accessible joining view (`Rejoindre une session`) asking for the 6-character room code (`K7M4PQ`).
- **Participant Link Simplicity**: Participant links contain only the room code (`?room=K7M4PQ`) and never expose facilitator credentials.
- **Unambiguous Receipt**: After submission, participants see a clear receipt: *"Réponse enregistrée. Elle a bien été ajoutée à la session K7M4PQ. Aucun nom n’est associé à ta réponse... Tu peux maintenant fermer cette page."*
- **No Individual Option Leak**: Selected option is never displayed on receipt; participant links cannot fetch aggregate results or facilitator controls.

---

## 2. Facilitator Control Clarity
- **Session Setup**: Facilitator receives an unambiguous 6-character code (`K7M4PQ`), a participant link, and a secure admin URL containing `#admin=<secret>`.
- **Live Counter Polling**: Facilitator dashboard displays a live total response counter (`{total} réponses reçues`) polled every 5 seconds without showing option breakdown while room is open.
- **Controlled Closure & Reveal**: Submissions can be closed (`Fermer les réponses`) before revealing aggregate distribution curves and discussion prompts.
- **Permanent Deletion**: Facilitator can delete the session (`Supprimer la session`), cascading deletion to room metadata, counters, and participant token hashes.
