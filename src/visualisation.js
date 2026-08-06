import { CANONICAL_OPTIONS } from './options.js';

/**
 * Strict validator for aggregate counts object.
 * Returns true if counts contains valid numeric values for all 5 canonical options.
 * 
 * @param {any} counts 
 * @returns {boolean}
 */
export function hasValidCounts(counts) {
  if (!counts || typeof counts !== 'object') return false;
  const keys = ['very-difficult', 'difficult', 'mixed', 'good', 'very-good'];
  return keys.every(k => typeof counts[k] === 'number' && !isNaN(counts[k]) && counts[k] >= 0);
}

/**
 * Calculates proportions and stacked horizontal bar segments for revealed group results.
 * 
 * @param {Record<string, number>} counts Map of optionId -> vote count
 * @returns {{ total: number, segments: Array<{ id: string, label: string, supportingText: string, count: number, percentage: number, colorVar: string, colorHex: string }>, isValid: boolean }}
 */
export function generateStackedBarVisualization(counts = {}) {
  const safeCounts = {};
  let total = 0;

  CANONICAL_OPTIONS.forEach(opt => {
    const raw = Number(counts[opt.id]);
    const val = isNaN(raw) || raw < 0 ? 0 : Math.floor(raw);
    safeCounts[opt.id] = val;
    total += val;
  });

  const rawPercentages = {};
  let pctSum = 0;

  CANONICAL_OPTIONS.forEach(opt => {
    if (total === 0) {
      rawPercentages[opt.id] = 0;
    } else {
      const pct = Math.round((safeCounts[opt.id] / total) * 100);
      rawPercentages[opt.id] = pct;
      pctSum += pct;
    }
  });

  // Adjust rounding difference on largest segment if pctSum !== 100 (when total > 0)
  if (total > 0 && pctSum !== 100) {
    const diff = 100 - pctSum;
    let maxOptId = CANONICAL_OPTIONS[0].id;
    let maxCount = -1;

    CANONICAL_OPTIONS.forEach(opt => {
      if (safeCounts[opt.id] > maxCount) {
        maxCount = safeCounts[opt.id];
        maxOptId = opt.id;
      }
    });

    rawPercentages[maxOptId] = Math.max(0, rawPercentages[maxOptId] + diff);
  }

  const segments = CANONICAL_OPTIONS.map(opt => ({
    id: opt.id,
    label: opt.label,
    supportingText: opt.supportingText,
    count: safeCounts[opt.id],
    percentage: rawPercentages[opt.id],
    colorVar: opt.colorVar,
    colorHex: opt.colorHex
  }));

  const hasNaN = segments.some(s => isNaN(s.count) || isNaN(s.percentage));

  return {
    total,
    segments,
    isValid: !hasNaN && segments.length === 5
  };
}
