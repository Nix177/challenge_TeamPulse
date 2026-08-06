# Team Pulse — Check-in collectif de 30 secondes

> **Usage unique & ciblé** : Un check-in collectif de 30 secondes au début d'une réunion, d'un atelier, d'un cours ou d'une session d'équipe.

Team Pulse est une application web éphémère et privée permettant à un groupe d'exprimer son état en arrivant, sans nom ni évaluation.

---

## 🎯 Cas d'usage principal

Le facilitateur ou l'animateur lance Team Pulse immédiatement **avant de démarrer l'activité principale**.

### Objectifs :
- Observer comment le groupe arrive.
- Reconnaître les différents états de présence et d'énergie.
- Décider si un bref ajustement est nécessaire avant de commencer.
- Ouvrir un court échange humain lorsque c'est utile.

### Ce que Team Pulse n'est pas :
- Pas un sondage de satisfaction de fin de session.
- Pas un questionnaire de performance ou d'évaluation.
- Pas un diagnostic de santé mentale.
- Pas une interprétation automatisée de l'équipe.

---

## 💬 Déroulement UX simplifié

1. **Facilitation** : Création directe de la session depuis la page d'accueil $\rightarrow$ Récupération du code et du lien à partager.
2. **Participation** : Saisie du code ou clic sur le lien $\rightarrow$ Réponse à la question unique (*« Comment vous sentez-vous en ce début de session ? »*) $\rightarrow$ Envoi en un clic (`Envoyer ma réponse`).
3. **Révélation des résultats** : L'animateur clique sur `Afficher les résultats` $\rightarrow$ Affichage d'un diagramme en barre 100% empilée ordonnée avec les 5 catégories et la question d'ouverture d'échange. Les participants voient également les résultats révélés en direct sans rechargement.

---

## 🔒 Architecture & Confidentialité

- **Schéma isolé Supabase** : `team_pulse_private` et procédures stockées publiques `tp_*` avec `SET search_path = ''`.
- **Anonymat strict** : Aucun nom n'est demandé, aucun identifiant individuel n'est conservé ni exposé.
- **Masquage en direct** : Les catégories choisies restent strictement masquées jusqu'à la clôture et révélation par l'animateur.
- **Tâche Cron de Nettoyage** : `team-pulse-cleanup-v1` (`0 * * * *`) pour la suppression physique des sessions expirées.

---

## 🛠️ Exécution & Tests

```bash
# Vérification de syntaxe
node --check src/app.js

# Exécution de la suite de tests automatisés
node --test

# Serveur local
python -m http.server 4173
```

---

## 🤖 Assistant de Rapport Interactif (Voice & RAG)

Un assistant vocal et textuel interactif est disponible sur l'onglet `Rapport interactif` (`rapport-interactif.html`). Il permet de poser des questions de vive voix ou par écrit sur le rapport de défi et la démarche de vibe coding.

### 🌐 Déploiement Vercel & Endpoint Serverless
L'assistant vocal s'appuie sur la route serverless Vercel `/api/live-token` qui génère des jetons éphémères à usage unique pour l'API WebSocket Gemini Live.

**Variables d'environnement (Vercel) :**
- `GOOGLE_API_KEY` *(Requis)* : Clé d'API Google Gemini (conservée uniquement côté serveur).
- `GEMINI_LIVE_MODEL` *(Optionnel)* : Modèle Live (défaut : `gemini-3.1-flash-live-preview`).
- `GEMINI_LIVE_VOICE` *(Optionnel)* : Voix de synthèse (défaut : `Sadaltager`).
- `ALLOWED_ORIGINS` *(Optionnel)* : Origines autorisées pour CORS.

**Test en développement local Vercel :**
```bash
# Lancement de l'environnement Vercel avec fonctions Serverless
npx vercel dev
```

### 📚 Sources RAG & Fichiers
- **Fichiers RAG publics** : `public/data/team-pulse-report.md` et `public/data/team-pulse-rag.json` (convertis automatiquement depuis `_inputs/`).
- **Assets de l'Avatar** : `public/assets/report-assistant/avatar-manifest.json` et frames WebP dans `public/assets/report-assistant/`.

### 🔐 Confidentialité & Règlements
- Aucune conversation ni aucun enregistrement audio n'est conservé sur nos serveurs.
- L'option de transcription est **locale et éphémère** (stockée uniquement en mémoire JavaScript de la session navigateur).
- En mode statique GitHub Pages, la réponse vocale signale que `/api/live-token` nécessite Vercel, tout en maintenant la recherche textuelle RAG fonctionnelle.

