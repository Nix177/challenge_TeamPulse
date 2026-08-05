/**
 * Centralized interface copy for Living Pulse.
 * Preserves exact requested French wording across all application views.
 */
export const COPY = Object.freeze({
  brand: {
    title: 'Team Pulse',
    tagline: 'Prendre le pouls. Ouvrir la conversation.',
    status: 'Session éphémère',
    statusAccessible: 'Aucune réponse conservée après le rechargement.',
    facilitatorAccess: 'Espace facilitateur',
    backToVoting: 'Retour au vote'
  },
  voting: {
    eyebrow: 'EXPRESSION INDIVIDUELLE',
    heading: 'Comment arrives-tu dans cette session ?',
    subheading: 'Choisis la nuance qui se rapproche le plus de ton état du moment. Il n’y a pas de bonne réponse.',
    continueBtn: 'Continuer',
    microcopy: 'Ta réponse ne sera associée à aucun nom.'
  },
  confirmation: {
    eyebrow: 'CONFIRMATION',
    heading: 'Est-ce bien ce que tu veux partager ?',
    subheading: 'Tu peux encore modifier ton choix avant de l’ajouter au pouls du groupe.',
    confirmBtn: 'Ajouter ma réponse',
    modifyBtn: 'Modifier'
  },
  thankYou: {
    eyebrow: 'RÉPONSE AJOUTÉE',
    heading: 'Merci d’avoir pris le temps de répondre.',
    body: 'Ta réponse a été ajoutée au pouls du groupe. Elle n’est associée à aucun nom et disparaîtra au rechargement de la page.',
    nextBtn: 'Passer à la personne suivante',
    microcopy: 'L’écran suivant repartira d’un choix vierge.'
  },
  facilitatorEmpty: {
    eyebrow: 'RÉSULTATS COLLECTIFS',
    heading: 'Le pouls du groupe se construit réponse après réponse.',
    body: 'Aucune réponse n’a encore été confirmée. Invite les participantes et participants à choisir la nuance qui leur correspond le mieux.',
    backBtn: 'Revenir au vote'
  },
  facilitatorPreReveal: {
    eyebrow: 'RÉSULTATS COLLECTIFS',
    body: 'Les réponses seront présentées uniquement sous forme agrégée.',
    revealBtn: 'Révéler le pouls du groupe',
    backBtn: 'Revenir au vote'
  },
  facilitatorRevealed: {
    eyebrow: 'LE POULS DU GROUPE',
    heading: 'Voici ce que le groupe a partagé.',
    distributionTitle: 'La répartition',
    observationEyebrow: 'À OBSERVER',
    observationHeading: 'Ce que la répartition permet de constater',
    conversationEyebrow: 'POUR OUVRIR LA CONVERSATION',
    conversationHeading: 'Une question à poser au groupe',
    conversationInstruction: 'Laisse quelques secondes de réflexion avant de donner la parole au groupe.',
    disclaimer: 'Ce résultat ne mesure ni la performance ni la santé du groupe. Il sert uniquement à commencer une conversation.',
    backBtn: 'Revenir au vote',
    resetBtn: 'Réinitialiser la session'
  },
  resetConfirmation: {
    heading: 'Effacer toutes les réponses ?',
    body: 'Cette action remettra le pouls à zéro. Les réponses de cette session ne pourront pas être récupérées.',
    confirmBtn: 'Effacer les réponses',
    cancelBtn: 'Conserver la session'
  },
  privacy: {
    statement: 'Aucune réponse n’est enregistrée ni envoyée. Les résultats disparaissent lorsque la page est rechargée.'
  },
  demo: {
    badge: 'DÉMO',
    heading: 'Données de démonstration',
    body: 'Charge un exemple de 16 réponses pour parcourir immédiatement l’expérience facilitateur.',
    actionBtn: 'Charger l’exemple',
    loadedAnnounce: '16 réponses de démonstration ont été chargées.'
  },
  presentation: {
    closedLabel: 'Comment ce prototype a été conçu',
    openHeading: 'Derrière Team Pulse',
    sections: [
      { title: 'Le besoin', text: 'Permettre à un groupe d’exprimer rapidement son état du moment sans transformer le ressenti en mesure de performance.' },
      { title: 'Le périmètre', text: 'Un appareil partagé, une session éphémère et aucune donnée conservée.' },
      { title: 'Les choix techniques', text: 'HTML sémantique, CSS natif, JavaScript modulaire et état uniquement en mémoire.' },
      { title: 'La validation', text: 'Tests du modèle et des règles, contrôle des mécanismes de confidentialité et vérification des parcours dans le navigateur.' },
      { title: 'La limite principale', text: 'L’absence d’identification réduit les données collectées, mais ne garantit pas l’anonymat contextuel dans un petit groupe.' }
    ],
    conclusion: 'Le prototype privilégie une logique simple, explicable et proportionnée à son usage.'
  }
});
