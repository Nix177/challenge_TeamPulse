/**
 * Centralized interface copy for Team Pulse — Multi-Device Session Architecture.
 * Preserves exact requested plain-language French wording across all participant and facilitator screens.
 */
export const COPY = Object.freeze({
  brand: {
    title: 'Team Pulse',
    tagline: 'Prendre le pouls. Ouvrir la conversation.',
    headerStatus: 'Session privée & éphémère',
    facilitatorAction: 'Espace facilitateur',
    joinAction: 'Rejoindre une session'
  },

  landing: {
    heading: 'Rejoindre une session',
    body: 'Entre le code partagé par la personne qui anime la session.',
    inputLabel: 'Code de session',
    placeholder: 'K7M4PQ',
    submitBtn: 'Rejoindre',
    createSessionBtn: 'Créer une session',
    errors: {
      empty: 'Entre un code de session.',
      notFound: 'Ce code ne correspond à aucune session ouverte.',
      closed: 'Cette session est terminée.',
      expired: 'Cette session a expiré.',
      network: 'Impossible de rejoindre la session pour le moment. Vérifie ta connexion et réessaie.'
    }
  },

  voting: {
    heading: 'Comment te sens-tu en arrivant aujourd’hui ?',
    supportingText: 'Choisis la réponse qui correspond le mieux à ton état du moment.',
    continueBtn: 'Continuer',
    microcopy: 'Aucun nom n’est demandé.',
    tabletDefaultDesc: 'Sélectionne une réponse pour en lire la description.'
  },

  confirmation: {
    heading: 'Tu confirmes cette réponse ?',
    formatSupportingText: (code) => `Elle sera ajoutée au décompte de la session ${code}.`,
    infoBlockHeading: 'Ce qui sera visible',
    infoBlockBody: 'Le facilitateur verra uniquement combien de personnes ont choisi chaque réponse. Aucun nom ni choix individuel ne sera affiché.',
    networkExplanation: 'Ta réponse est transmise à cette session uniquement pour être comptée.',
    confirmBtn: 'Valider ma réponse',
    modifyBtn: 'Changer de réponse'
  },

  receipt: {
    heading: 'Votre réponse a rejoint le pouls.',
    formatBody: (code) => `Elle a bien été ajoutée à la session ${code}.`,
    privacyExplanation: 'La personne qui anime voit uniquement le nombre de participations pendant la collecte.',
    waitingStatement: 'La répartition sera révélée après la clôture des réponses.',
    closingInstruction: 'Vous pouvez garder cette page ouverte ou la fermer.',
    closedNotice: 'Les réponses sont maintenant closes. La répartition va être présentée par la personne qui anime.',
    offlineNotice: 'Actualisation momentanément indisponible.',
    alreadySubmitted: 'Une réponse a déjà été enregistrée depuis ce navigateur pour cette session.',
    yourChoiceLabel: 'Votre choix enregistré :'
  },

  creation: {
    heading: 'Créer une session',
    body: 'Une session temporaire permet à chaque personne de répondre depuis son propre appareil.',
    durationStatement: 'La session restera accessible pendant 12 heures au maximum.',
    createBtn: 'Créer la session',
    loadingBtn: 'Création de la session…',
    errorMessage: 'La session n’a pas pu être créée. Vérifie ta connexion et réessaie.'
  },

  facilitatorDashboard: {
    openHeading: 'Le pouls du groupe se construit',
    openInstruction: 'Partage ce code avec les participantes et participants.',
    codeLabel: 'Code de session',
    linkLabel: 'Lien à partager',
    copyCodeBtn: 'Copier le code',
    copyLinkBtn: 'Copier le lien',
    codeCopied: 'Code copié !',
    linkCopied: 'Lien copié !',
    statusOpen: 'Session ouverte',
    closeBtn: 'Fermer les réponses',
    refreshBtn: 'Actualiser',
    closedHeading: 'Les réponses sont closes.',
    closedBody: 'Les participations pour cette session sont fermées.',
    revealBtn: 'Afficher la répartition',
    deleteBtn: 'Supprimer la session',
    privacyNote: 'Les choix restent masqués jusqu’à la clôture.',
    emptyState: 'En attente des premières réponses…'
  },

  facilitatorRevealed: {
    heading: 'Répartition du groupe',
    distributionTitle: 'Les réponses',
    observationHeading: 'Ce qu’on peut observer',
    conversationHeading: 'Question à discuter ensemble',
    conversationInstruction: 'Laisse au groupe quelques secondes pour y réfléchir avant d’échanger.',
    disclaimer: 'Ce résultat ne mesure ni la performance ni le bien-être du groupe. Il sert de point de départ à une discussion.',
    deleteBtn: 'Supprimer la session'
  },

  deletionConfirmation: {
    heading: 'Supprimer définitivement cette session ?',
    body: 'Le code, les compteurs et les participations techniques seront supprimés. Cette action est définitive.',
    confirmBtn: 'Oui, supprimer la session',
    cancelBtn: 'Annuler'
  },

  privacy: {
    statement: 'Aucun nom n’est demandé. Le facilitateur ne voit que la répartition du groupe, jamais les choix individuels.'
  },

  demo: {
    badge: 'DÉMO',
    heading: 'Mode démonstration local',
    body: 'Simule l’expérience multi-appareils sans connexion Supabase.',
    actionBtn: 'Charger l’exemple démo',
    loadedAnnounce: '16 réponses de démonstration ont été chargées.'
  },

  presentation: {
    closedLabel: 'Voir les choix de conception',
    openHeading: 'Pourquoi Team Pulse est construit ainsi',
    sections: [
      { title: 'Le besoin', text: 'Aider un groupe à dire rapidement comment il arrive, sans noter ni évaluer les personnes.' },
      { title: 'Architecture multi-appareils', text: 'Chaque personne répond depuis son téléphone ou ordinateur via un code de session court sans création de compte.' },
      { title: 'Sécurité facilitateur', text: 'Un secret d’administration à fort niveau d’entropie dans le fragment d’URL (#admin=...) protège les actions de clôture et d’affichage des résultats.' },
      { title: 'Règles déterministes', text: 'Les observations sont générées par des règles déterministes strictes et transparentes, sans IA au runtime.' },
      { title: 'Gestion de la confidentialité', text: 'Seules les statistiques agrégées sont accessibles. Aucun identifiant individuel n’est associé aux choix.' }
    ],
    conclusion: 'Un outil simple, éphémère et respectueux des personnes.'
  }
});

/**
 * Pure formatter for response count in multi-device room.
 * 
 * @param {number} total 
 * @returns {string}
 */
export function formatRoomResponseCount(total) {
  if (total <= 0) return '0 réponse reçue';
  if (total === 1) return '1 réponse reçue';
  return `${total} réponses reçues`;
}
