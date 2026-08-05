/**
 * Centralized interface copy for Team Pulse.
 * Preserves exact requested plain-language French wording across all application views.
 */
export const COPY = Object.freeze({
  brand: {
    title: 'Team Pulse',
    tagline: 'Prendre le pouls. Ouvrir la conversation.',
    headerStatus: 'Réponses non conservées',
    accessibleExplanation: 'Les réponses restent uniquement dans cette page et disparaissent lorsqu’elle est rechargée.',
    facilitatorAction: 'Voir les résultats',
    returnAction: 'Retour au questionnaire'
  },
  voting: {
    stepLabel: '1 sur 3 · Choisir',
    heading: 'Comment te sens-tu en arrivant aujourd’hui ?',
    supportingText: 'Choisis la réponse qui correspond le mieux à ton état du moment. Tu pourras la vérifier avant de la valider.',
    continueBtn: 'Continuer',
    microcopy: 'Aucun nom n’est demandé.',
    tabletDefaultDesc: 'Sélectionne une réponse pour en lire la description.'
  },
  confirmation: {
    stepLabel: '2 sur 3 · Vérifier',
    heading: 'Tu confirmes cette réponse ?',
    supportingText: 'Après validation, elle sera ajoutée au décompte de cette session.',
    infoBlockHeading: 'Ce qui apparaîtra dans les résultats',
    infoBlockBody: 'Le facilitateur verra uniquement combien de personnes ont choisi chaque réponse. Aucun nom ni choix individuel ne sera affiché.',
    privacyLine: 'Rien n’est envoyé et toutes les réponses disparaissent lorsque la page est rechargée.',
    confirmBtn: 'Valider ma réponse',
    modifyBtn: 'Changer de réponse'
  },
  receipt: {
    stepLabel: '3 sur 3 · Terminé',
    heading: 'C’est noté.',
    primaryBody: 'Ta réponse a bien été comptée.',
    explanation: 'Le résultat final montrera uniquement la répartition du groupe. Ton choix individuel ne sera pas affiché.',
    handoffInstruction: 'Tu peux maintenant passer l’appareil à la personne suivante.',
    nextBtn: 'Commencer une nouvelle réponse',
    microcopy: 'Ton choix ne sera plus visible sur l’écran suivant.'
  },
  facilitatorEmpty: {
    heading: 'Aucune réponse pour le moment.',
    body: 'Les résultats apparaîtront dès qu’une première réponse aura été validée.',
    backBtn: 'Retour au questionnaire'
  },
  facilitatorPreReveal: {
    body: 'Le résultat affichera uniquement la répartition du groupe, sans réponse individuelle.',
    revealBtn: 'Afficher la répartition',
    backBtn: 'Ajouter d’autres réponses'
  },
  facilitatorRevealed: {
    heading: 'Répartition du groupe',
    distributionTitle: 'Les réponses',
    observationHeading: 'Ce qu’on peut observer',
    conversationHeading: 'Question à discuter ensemble',
    conversationInstruction: 'Laisse au groupe quelques secondes pour y réfléchir avant d’échanger.',
    disclaimer: 'Ce résultat ne mesure ni la performance ni le bien-être du groupe. Il sert de point de départ à une discussion.',
    backBtn: 'Ajouter d’autres réponses',
    resetBtn: 'Effacer la session'
  },
  resetConfirmation: {
    heading: 'Effacer les réponses de cette session ?',
    body: 'Toutes les réponses recueillies seront supprimées immédiatement. Cette action est définitive.',
    confirmBtn: 'Oui, tout effacer',
    cancelBtn: 'Annuler'
  },
  privacy: {
    statement: 'Aucun nom n’est demandé. Les réponses ne quittent pas cette page et disparaissent lorsqu’elle est rechargée.'
  },
  demo: {
    badge: 'DÉMO',
    heading: 'Données de démonstration',
    body: 'Charge un exemple de 16 réponses pour parcourir immédiatement l’expérience facilitateur.',
    actionBtn: 'Charger l’exemple',
    loadedAnnounce: '16 réponses de démonstration ont été chargées.'
  },
  presentation: {
    closedLabel: 'Voir les choix de conception',
    openHeading: 'Pourquoi Team Pulse est construit ainsi',
    sections: [
      { title: 'Le besoin', text: 'Aider un groupe à dire rapidement comment il arrive, sans noter ni évaluer les personnes.' },
      { title: 'Pourquoi un seul appareil', text: 'Ce périmètre permet de tester l’usage sans comptes, sans identifiants et sans infrastructure inutile.' },
      { title: 'Pourquoi aucune IA dans l’analyse', text: 'Les observations sont choisies par des règles simples et visibles. Le résultat reste prévisible, vérifiable et facile à expliquer.' },
      { title: 'Ce qui a été vérifié', text: 'Les calculs, les cas limites, la navigation au clavier, la confidentialité et les principaux parcours utilisateur.' },
      { title: 'La limite principale', text: 'Dans un petit groupe, l’ordre de passage peut parfois permettre de deviner une réponse, même si aucun nom n’est demandé.' }
    ],
    conclusion: 'Ce prototype cherche moins à tout faire qu’à résoudre clairement un besoin précis.'
  }
});

/**
 * Pure formatter for collected response counts.
 * 
 * @param {number} total 
 * @returns {string}
 */
export function formatCollectedCount(total) {
  if (total <= 1) return `${total} réponse recueillie dans cette session`;
  return `${total} réponses recueillies dans cette session`;
}

/**
 * Pure formatter for revealed supporting count line.
 * 
 * @param {number} total 
 * @returns {string}
 */
export function formatSupportingCount(total) {
  if (total <= 1) return `${total} réponse recueillie`;
  return `${total} réponses recueillies`;
}

/**
 * Pure formatter for pre-reveal heading.
 * 
 * @param {number} total 
 * @returns {string}
 */
export function formatPreRevealHeading(total) {
  if (total <= 1) return `${total} réponse a été recueillie.`;
  return `${total} réponses ont été recueillies.`;
}

/**
 * Pure formatter for live-region submission announce.
 * 
 * @param {number} total 
 * @returns {string}
 */
export function formatSubmissionLiveAnnounce(total) {
  return `Réponse comptée. ${formatCollectedCount(total)}`;
}
