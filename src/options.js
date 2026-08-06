/**
 * Canonical options for Team Pulse in exact required order.
 */
export const CANONICAL_OPTIONS = Object.freeze([
  {
    id: 'very-difficult',
    label: 'Pas bien du tout',
    supportingText: 'Quelque chose me pèse ou j’ai très peu d’énergie.',
    colorVar: 'var(--tone-1)',
    colorHex: '#D96B64'
  },
  {
    id: 'difficult',
    label: 'Pas très bien',
    supportingText: 'Je ne me sens pas complètement disponible.',
    colorVar: 'var(--tone-2)',
    colorHex: '#E08A68'
  },
  {
    id: 'mixed',
    label: 'Mitigé',
    supportingText: 'J’ai des ressentis partagés.',
    colorVar: 'var(--tone-3)',
    colorHex: '#E5B365'
  },
  {
    id: 'good',
    label: 'Plutôt bien',
    supportingText: 'Je me sens disponible pour commencer.',
    colorVar: 'var(--tone-4)',
    colorHex: '#84A98C'
  },
  {
    id: 'very-good',
    label: 'Très bien',
    supportingText: 'J’arrive avec de l’énergie.',
    colorVar: 'var(--tone-5)',
    colorHex: '#2F7C6E'
  }
]);

export const OPTION_IDS = Object.freeze(CANONICAL_OPTIONS.map(opt => opt.id));

export const DEMO_COUNTS = Object.freeze({
  'very-difficult': 1,
  'difficult': 2,
  'mixed': 4,
  'good': 6,
  'very-good': 3
});
