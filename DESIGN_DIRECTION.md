# Living Pulse — Multi-Device Session Design Direction

## 1. Product Model Evolution
Team Pulse has evolved from a single-device prototype into a private, multi-device session application:
- **Participant Landing Screen**: Users land on `Rejoindre une session` to enter a 6-character room code or join directly via share link (`?room=K7M4PQ`).
- **Participant Flow**: Questionnaire -> Confirmation -> Submission Receipt ("Réponse enregistrée. Tu peux maintenant fermer cette page.").
- **Facilitator Dashboard**: Displays room code (`K7M4PQ`), participant link (`?room=K7M4PQ`), live total response counter, submission closure action, aggregate reveal, and permanent deletion action.

## 2. Palette & Tokens
```css
--canvas: #f3efe7;
--canvas-deep: #e9e2d7;
--surface: #fffdf9;
--surface-raised: #ffffff;
--ink: #17231e;
--ink-soft: #59655f;
--ink-faint: #54615b; /* > 4.5:1 WCAG AA contrast */
--line: #d9d4ca;

--accent: #126a5a;
--accent-strong: #0c5145;
--accent-soft: #dcece6;

--tone-1: #b65345; /* Très difficile */
--tone-2: #d0784d; /* Difficile */
--tone-3: #bd9b3f; /* Mitigé */
--tone-4: #4f9270; /* Bien */
--tone-5: #1d766c; /* Très bien */

--danger: #a63f3f;
```

## 3. Interface Copy (Centralized in `src/copy.js`)
- **Landing**: `Rejoindre une session`, `Code de session`, `Rejoindre`, `Créer une session`.
- **Voting**: `Comment te sens-tu en arrivant aujourd’hui ?`, `Continuer`, `Aucun nom n’est demandé.`
- **Confirmation**: `Tu confirmes cette réponse ?`, `Elle sera ajoutée au décompte de la session {roomCode}.`, `Ce qui sera visible`, `Valider ma réponse`, `Changer de réponse`.
- **Receipt**: `Réponse enregistrée.`, `Elle a bien été ajoutée à la session {roomCode}.`, `Aucun nom n’est associé à ta réponse...`, `Tu peux maintenant fermer cette page.`
- **Facilitator**: `La session est ouverte.`, `Code de session`, `Lien à partager`, `Fermer les réponses`, `Afficher la répartition`, `Supprimer la session`.
