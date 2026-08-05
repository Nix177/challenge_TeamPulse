/**
 * Canonical options for Team Pulse in exact required order.
 */
export const CANONICAL_OPTIONS = Object.freeze([
  {
    id: 'very-difficult',
    label: 'Très difficile',
    supportingText: 'J’aurais besoin de soutien',
    colorHint: 'hsl(8, 75%, 52%)'
  },
  {
    id: 'difficult',
    label: 'Difficile',
    supportingText: 'Quelque chose me freine',
    colorHint: 'hsl(28, 80%, 54%)'
  },
  {
    id: 'mixed',
    label: 'Mitigé',
    supportingText: 'Des éléments positifs et difficiles',
    colorHint: 'hsl(42, 85%, 50%)'
  },
  {
    id: 'good',
    label: 'Bien',
    supportingText: 'Je peux avancer sereinement',
    colorHint: 'hsl(155, 60%, 42%)'
  },
  {
    id: 'very-good',
    label: 'Très bien',
    supportingText: 'J’arrive avec beaucoup d’énergie',
    colorHint: 'hsl(175, 70%, 38%)'
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
