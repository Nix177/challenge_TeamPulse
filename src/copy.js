/**
 * Centralized interface copy for Team Pulse — 30-second collective check-in.
 * Uses formal French ("vous") consistently across participant and facilitator screens.
 */
export const COPY = Object.freeze({
  brand: {
    title: 'Team Pulse'
  },

  landing: {
    heading: 'Prenez le pouls du groupe avant de commencer',
    body: 'Un check-in de 30 secondes, sans nom, pour une réunion, un atelier ou un cours.',
    inputLabel: 'Code de session',
    placeholder: 'K7M4PQ',
    submitBtn: 'Rejoindre',
    createSessionBtn: 'Créer une session',
    creatingBtn: 'Création de la session…',
    errors: {
      empty: 'Entrez un code de session.',
      notFound: 'Ce code ne correspond à aucune session ouverte.',
      closed: 'Cette session est terminée.',
      expired: 'Cette session a expiré.',
      createFailed: 'La session n’a pas pu être créée. Vérifiez votre connexion et réessayez.',
      network: 'Impossible de rejoindre la session pour le moment. Vérifiez votre connexion et réessayez.'
    }
  },

  voting: {
    heading: 'Comment vous sentez-vous en ce début de session ?',
    supportingText: 'Choisissez la réponse qui correspond le mieux à votre état du moment.',
    submitBtn: 'Envoyer ma réponse',
    submittingBtn: 'Envoi de la réponse…',
    microcopy: 'Aucun nom n’est demandé.'
  },

  receipt: {
    heading: 'Réponse envoyée',
    body: 'Votre choix a bien été enregistré.',
    yourChoiceLabel: 'Votre réponse :',
    waitingStatement: 'Les résultats apparaîtront ici lorsque la personne qui anime les affichera.',
    closedWithoutCountsNotice: 'Les réponses sont closes, mais les résultats ne sont pas encore disponibles.',
    secondaryText: 'Vous pouvez garder cette page ouverte.',
    closedNotice: 'Les résultats sont maintenant disponibles ci-dessous.',
    offlineNotice: 'Actualisation momentanément indisponible.',
    alreadySubmitted: 'Une réponse a déjà été enregistrée depuis ce navigateur.',
    refreshBtnParticipant: 'Actualiser maintenant',
    refreshBtnLoading: 'Actualisation…',
    refreshStatusWaiting: 'Les résultats ne sont pas encore affichés.'
  },

  creation: {
    heading: 'Créer une session',
    body: 'Une session temporaire permet à chaque personne de répondre depuis son propre appareil.',
    createBtn: 'Créer la session',
    loadingBtn: 'Création de la session…',
    errorMessage: 'La session n’a pas pu être créée. Vérifiez votre connexion et réessayez.'
  },

  facilitatorDashboard: {
    heading: 'Session prête',
    instruction: 'Partagez le lien avec le groupe, puis affichez les résultats quand tout le monde a répondu.',
    step1Title: '1. Partagez le lien',
    codeLabel: 'Code de session',
    linkLabel: 'Lien à partager',
    copyCodeBtn: 'Copier le code',
    copyLinkBtn: 'Copier le lien',
    codeCopied: 'Code copié ✓',
    linkCopied: 'Lien copié ✓',
    copyFailed: 'Copie impossible. Sélectionnez le contenu manuellement.',
    step2Title: '2. Affichez les résultats',
    revealBtn: 'Afficher les résultats',
    revealingBtn: 'Affichage des résultats…',
    refreshBtn: 'Actualiser',
    refreshBtnLoading: 'Actualisation…',
    refreshStatusUpdated: 'Compteur actualisé.',
    refreshStatusFailed: 'Impossible d’actualiser pour le moment.',
    emptyState: 'En attente de la première réponse.',
    smallGroupConfirm: {
      question: 'Avec moins de trois réponses, certains choix peuvent être faciles à deviner. Afficher quand même ?',
      confirmBtn: 'Afficher quand même',
      cancelBtn: 'Attendre d’autres réponses'
    }
  },

  results: {
    heading: 'Le groupe en ce début de session',
    formatTotal: (total) => total <= 1 ? `${total} réponse` : `${total} réponses`,
    facilitationPromptHeading: 'Pour ouvrir l’échange',
    facilitationPromptText: 'De quoi avons-nous besoin pour bien commencer cette session ?',
    facilitationPromptSub: 'Un instantané du groupe, pas une évaluation.',
    newSessionBtn: 'Créer une nouvelle session',
    refreshBtn: 'Actualiser',
    refreshBtnLoading: 'Actualisation…',
    refreshStatusUpdated: 'Résultats actualisés.',
    refreshStatusFailed: 'Impossible d’actualiser les résultats pour le moment.',
    deleteBtn: 'Supprimer cette session'
  },

  deletionConfirmation: {
    heading: 'Supprimer cette session ?',
    body: 'La session et ses participations seront supprimées définitivement.',
    confirmBtn: 'Oui, supprimer',
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
  }
});

/**
 * Pure formatter for response count.
 * 
 * @param {number} total 
 * @returns {string}
 */
export function formatRoomResponseCount(total) {
  if (total <= 0) return '0 réponse reçue';
  if (total === 1) return '1 réponse reçue';
  return `${total} réponses reçues`;
}
