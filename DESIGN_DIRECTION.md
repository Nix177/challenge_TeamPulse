# Design Direction — Living Pulse Visual System

## Core Aesthetic Concept
The visual experience of Team Pulse transitions dynamically through three stages:
1. **Individual Expression**: Warm, tactile radio tiles for individual participant choice (`Choisis la réponse qui correspond le mieux à ton état du moment.`).
2. **Collective Perception**: Clean, aggregate pulse wave visualization generated deterministically from group percentages.
3. **Human Conversation**: Editorial observation cards and framing questions for facilitator-guided group discussion.

## Multi-Device Handoff & Privacy Interface Rules
- **No Shared Device Assumptions**: Zero references to passing an apparatus, resetting the screen for another participant, or taking another vote on the same device.
- **Participant Receipt Discipline**: Upon submission, the participant receives an immediate confirmation receipt (*« Réponse enregistrée. Elle a bien été ajoutée à la session {code}. Aucun nom n’est associé à ta réponse... Tu peux maintenant fermer cette page. »*). The selected choice and choice color are NEVER displayed on the receipt.
- **URL Fragment Administration Protection**: Administration secret exists strictly inside `#admin=<secret>` URL fragment for facilitator views and is never included in participant share URLs (`?room=K7M4PQ`).
