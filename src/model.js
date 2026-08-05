import { OPTION_IDS, DEMO_COUNTS } from './options.js';

/**
 * Creates an initial empty state object with 0 counts for all canonical options.
 * @returns {Record<string, number>}
 */
export function createEmptyCounts() {
  const counts = {};
  for (const id of OPTION_IDS) {
    counts[id] = 0;
  }
  return Object.freeze(counts);
}

/**
 * Calculates total number of votes.
 * @param {Record<string, number>} counts 
 * @returns {number}
 */
export function getTotalVotes(counts) {
  if (!counts) return 0;
  return OPTION_IDS.reduce((sum, id) => sum + (Number(counts[id]) || 0), 0);
}

/**
 * Returns an immutable new counts object with the vote added.
 * Throws an Error if the optionId is invalid.
 * @param {Record<string, number>} counts 
 * @param {string} optionId 
 * @returns {Record<string, number>}
 */
export function addVote(counts, optionId) {
  if (!OPTION_IDS.includes(optionId)) {
    throw new Error(`Invalid option ID: "${optionId}"`);
  }
  const current = counts && typeof counts[optionId] === 'number' ? counts[optionId] : 0;
  const updated = {
    ...counts,
    [optionId]: current + 1
  };
  return Object.freeze(updated);
}

/**
 * Calculates rounded percentages for all canonical options.
 * @param {Record<string, number>} counts 
 * @returns {Record<string, number>}
 */
export function getPercentages(counts) {
  const total = getTotalVotes(counts);
  const percentages = {};
  for (const id of OPTION_IDS) {
    if (total === 0) {
      percentages[id] = 0;
    } else {
      const count = Number(counts[id]) || 0;
      percentages[id] = Math.round((count / total) * 100);
    }
  }
  return Object.freeze(percentages);
}

/**
 * Returns demo counts object.
 * @returns {Record<string, number>}
 */
export function createDemoCounts() {
  return Object.freeze({ ...DEMO_COUNTS });
}

/**
 * Formats total responses in correct French singular/plural.
 * @param {number} total 
 * @returns {string}
 */
export function formatTotalResponsesFrench(total) {
  if (total === 0) return '0 réponse enregistrée';
  if (total === 1) return '1 réponse enregistrée';
  return `${total} réponses enregistrées`;
}
