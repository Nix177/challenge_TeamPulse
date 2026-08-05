# Team Pulse

> **Tagline**: “Prendre le pouls. Ouvrir la conversation.”

Team Pulse est une application web statique et éphémère à architecture multi-appareils privée, connectée à un projet Supabase partagé via un schéma isolé (`team_pulse_private`) et des procédures stockées RPC préfixées (`tp_*`).

---

## 💬 Rôles & Architecture

L'application prend en charge deux rôles distincts :

### 1. Rôle Participant
- Rejoint une session via un code à 6 caractères (ex: `K7M4PQ`) ou un lien participant (`?room=K7M4PQ`).
- Transmet une seule réponse anonyme.
- Obtient un récépissé d’enregistrement (*« Réponse enregistrée. Elle a bien été ajoutée à la session K7M4PQ. »*).
- Ne voit jamais son choix réaffiché sur le récépissé, ni les réponses des autres, ni les résultats agrégés.

### 2. Rôle Facilitateur
- Crée une session temporaire (durée max par défaut : 12h).
- Obtient un code de session (`K7M4PQ`) et un secret d'administration dans le fragment d'URL (`#admin=<secret>`).
- Partage le code ou le lien participant (`?room=K7M4PQ`). Le lien participant **ne contient jamais** le secret d'administration.
- Observe en temps réel le nombre total de réponses reçues (rafraîchi toutes les 5s).
- Clôture les réponses et affiche la répartition agrégée du groupe et la question de discussion.
- Supprimer définitivement la session à la fin de l'atelier.

---

## 🔒 Configuration Supabase & Nettoyage Réel

- **URL du Projet** : `https://qsfcfqstvmmyqchlrkhk.supabase.co`
- **Clé Publique (Publishable Key)** : `sb_publishable_yPlrdLevpZxNkpQxMG3qxA_MWIjF0zA`
- **Tâche Cron de Nettoyage Réelle Active** :
  - Nom du job : `team-pulse-cleanup-v1`
  - Fréquence : `0 * * * *` (chaque heure à la minute 0)
  - Commande : `SELECT team_pulse_private.cleanup_expired_rooms();`

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
