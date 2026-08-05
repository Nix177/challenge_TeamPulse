import { getTotalVotes } from './model.js';

export const DISCLAIMER_TEXT = "Ce résultat ne mesure ni la performance ni la santé du groupe. Il sert uniquement à commencer une conversation.";

/**
 * Calculates deterministic observation and conversation prompt based on participant response counts.
 * Implements strict priority-ordered rules.
 * 
 * @param {Record<string, number>} counts 
 * @returns {{ ruleId: string, observation: string|null, prompt: string|null, emptyMessage: string|null, disclaimer: string }}
 */
export function calculateInsight(counts) {
  const total = getTotalVotes(counts);

  if (total === 0) {
    return {
      ruleId: 'empty',
      observation: null,
      prompt: null,
      emptyMessage: "Le groupe doit d'abord contribuer pour afficher une observation.",
      disclaimer: DISCLAIMER_TEXT
    };
  }

  const veryDifficult = Number(counts['very-difficult']) || 0;
  const difficult = Number(counts['difficult']) || 0;
  const good = Number(counts['good']) || 0;
  const veryGood = Number(counts['very-good']) || 0;

  const negativeShare = (veryDifficult + difficult) / total;
  const positiveShare = (good + veryGood) / total;

  // Rule 1 — support
  if (negativeShare >= 0.5) {
    return {
      ruleId: 'support',
      observation: 'Une part importante du groupe rencontre des difficultés.',
      prompt: 'Qu’est-ce qui pèse le plus aujourd’hui, et quel petit soutien serait immédiatement utile ?',
      emptyMessage: null,
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // Rule 2 — contrast
  if (negativeShare >= 0.25 && positiveShare >= 0.25) {
    return {
      ruleId: 'contrast',
      observation: 'Les ressentis sont particulièrement contrastés.',
      prompt: 'Qu’est-ce qui pourrait expliquer que les personnes vivent cette situation différemment ?',
      emptyMessage: null,
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // Rule 3 — preserve
  if (positiveShare >= 0.55) {
    return {
      ruleId: 'preserve',
      observation: 'Le ressenti général est plutôt positif.',
      prompt: 'Qu’est-ce qui fonctionne bien actuellement et que le groupe devrait préserver ?',
      emptyMessage: null,
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // Rule 4 — small improvement (fallback)
  return {
    ruleId: 'small-improvement',
    observation: 'Aucun ressenti ne domine clairement.',
    prompt: 'Quel petit changement concret pourrait améliorer la prochaine session ?',
    emptyMessage: null,
    disclaimer: DISCLAIMER_TEXT
  };
}
