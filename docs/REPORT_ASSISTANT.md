# Guide d'Intégration de la Séquence d'Images de l'Avatar — Report Assistant

Ce document détaille les instructions permettant à Nicolas d'intégrer la séquence d'images générées de l'avatar pour l'assistant vocal Team Pulse.

---

## 📁 Emplacement des Assets

Tous les assets de l'avatar doivent être placés dans le dossier suivant :

```text
public/assets/report-assistant/
```

Fichier de manifeste principal :

```text
public/assets/report-assistant/avatar-manifest.json
```

---

## 🖼️ Naming Convention des Images WebP

Placez vos fichiers d'images au format WebP avec la structure recommandée ci-dessous :

- **Images fixes d'état** :
  - `public/assets/report-assistant/idle.webp` (Avatar au repos / prêt)
  - `public/assets/report-assistant/listening.webp` (Avatar en train d'écouter au micro)
  - `public/assets/report-assistant/thinking.webp` (Avatar en cours de recherche RAG)

- **Séquence d'images de parole (`speaking`)** :
  - `public/assets/report-assistant/speaking/frame-001.webp`
  - `public/assets/report-assistant/speaking/frame-002.webp`
  - `public/assets/report-assistant/speaking/frame-003.webp`
  - ...
  - `public/assets/report-assistant/speaking/frame-012.webp` (ou autant de frames que souhaité).

---

## ⚙️ Format du Fichier `avatar-manifest.json`

Une fois vos images ajoutées dans le répertoire `public/assets/report-assistant/`, mettez à jour `public/assets/report-assistant/avatar-manifest.json` avec la liste exacte de vos chemins :

```json
{
  "fps": 12,
  "idle": [
    "public/assets/report-assistant/idle.webp"
  ],
  "listening": [
    "public/assets/report-assistant/listening.webp"
  ],
  "thinking": [
    "public/assets/report-assistant/thinking.webp"
  ],
  "speaking": [
    "public/assets/report-assistant/speaking/frame-001.webp",
    "public/assets/report-assistant/speaking/frame-002.webp",
    "public/assets/report-assistant/speaking/frame-003.webp",
    "public/assets/report-assistant/speaking/frame-004.webp",
    "public/assets/report-assistant/speaking/frame-005.webp",
    "public/assets/report-assistant/speaking/frame-006.webp",
    "public/assets/report-assistant/speaking/frame-007.webp",
    "public/assets/report-assistant/speaking/frame-008.webp",
    "public/assets/report-assistant/speaking/frame-009.webp",
    "public/assets/report-assistant/speaking/frame-010.webp",
    "public/assets/report-assistant/speaking/frame-011.webp",
    "public/assets/report-assistant/speaking/frame-012.webp"
  ]
}
```

---

## 🎨 Fonctionnement Automatique

1. `ReportAvatarAnimator` précharge automatiquement toutes les images spécifiées dans le manifeste.
2. Lorsque l'assistant parle (`PcmAudioPlayer`), l'animation boucle les images de la clé `speaking` à la vitesse spécifiée par `fps`.
3. En cas d'activation du mode de mouvement réduit (`prefers-reduced-motion: reduce`), seule la première image est affichée.
4. Si les fichiers d'images sont absents, le système utilise l'illustration SVG de secours (`placeholder-avatar.svg`) sans altérer le fonctionnement du chatbot.
