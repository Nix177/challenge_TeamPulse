/**
 * Canonical options for Team Pulse in exact required order.
 */
export const CANONICAL_OPTIONS = Object.freeze([
  {
    id: 'very-difficult',
    label: 'Très difficile',
    supportingText: 'J’aurais besoin de soutien',
    colorVar: 'var(--tone-1)',
    colorHex: '#b65345'
  },
  {
    id: 'difficult',
    label: 'Difficile',
    supportingText: 'Quelque chose me freine',
    colorVar: 'var(--tone-2)',
    colorHex: '#d0784d'
  },
  {
    id: 'mixed',
    label: 'Mitigé',
    supportingText: 'Des éléments positifs et difficiles',
    colorVar: 'var(--tone-3)',
    colorHex: '#bd9b3f'
  },
  {
    id: 'good',
    label: 'Bien',
    supportingText: 'Je peux avancer sereinement',
    colorVar: 'var(--tone-4)',
    colorHex: '#4f9270'
  },
  {
    id: 'very-good',
    label: 'Très bien',
    supportingText: 'J’arrive avec beaucoup d’énergie',
    colorVar: 'var(--tone-5)',
    colorHex: '#1d766c'
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
