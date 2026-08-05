# Team Pulse

> **Tagline**: “Prendre le pouls. Ouvrir la conversation.”

Team Pulse est une application web statique et éphémère à architecture multi-appareils privée, conçue pour les ateliers d'équipe synchrones. Chaque participant répond depuis son propre smartphone ou ordinateur via un code de session court. Les choix individuels restent strictement anonymes et sont agrégés uniquement pour alimenter la discussion collective.

---

## 💬 Rôles & Architecture

L'application prend en charge deux rôles distincts :

### 1. Rôle Participant
- Rejoint une session via un code à 6 caractères (ex: `K7M4PQ`) ou un lien de partage (`?room=K7M4PQ`).
- Transmet une seule réponse anonyme.
- Obtient un récépissé d'enregistrement (*« Réponse enregistrée. Tu peux maintenant fermer cette page. »*).
- Ne voit jamais les réponses individuelles ni les résultats agrégés.

### 2. Rôle Facilitateur
- Crée une session temporaire (durée max par défaut : 12h).
- Obtient un code de session (`K7M4PQ`) et un secret d'administration dans le fragment d'URL (`#admin=<secret>`).
- Partage le code ou le lien participant (`?room=K7M4PQ`). Le lien participant **ne contient jamais** le secret d'administration.
- Observe en temps réel le nombre total de réponses reçues (rafraîchi toutes les 5s).
- Clôture les réponses et affiche la répartition agrégée du groupe et la question de discussion.
- Supprime définitivement la session à la fin de l'atelier.

---

## 🔗 URLs Locales & Modes

- **Mode Participant (Saisie du code)** : `http://localhost:4173/`
- **Lien Participant Direct** : `http://localhost:4173/?room=K7M4PQ`
- **Lien Dashboard Facilitateur** : `http://localhost:4173/?room=K7M4PQ#admin=<secret>`
- **Mode Démo Local** (`?demo=1`) : `http://localhost:4173/?demo=1` (simule la création, le vote et la révélation sans connexion backend).

---

## 🔒 Configuration Supabase & Sécurité

1. Exécuter le script SQL dans votre projet Supabase : [`supabase/schema.sql`](file:///e:/challenge%20huumyk/supabase/schema.sql).
2. Mettre à jour `src/config.js` avec l'URL du projet et la clé publique `anon`.
3. **Sécurité RLS & RPC** : Accès direct aux tables révoqué pour les utilisateurs anonymes. Toutes les opérations s'effectuent via des procédures stockées `SECURITY DEFINER`.

---

## 🛠️ Exécution & Tests

### Démarrer le serveur local
```bash
python -m http.server 4173
```

### Lancer la suite de tests unitaires et de sécurité
```bash
node --test
```

### Vérifier la syntaxe
```bash
node --check src/app.js
```
