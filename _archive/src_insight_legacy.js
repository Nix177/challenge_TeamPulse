/**
 * ARCHIVED MODULE: Legacy Automatic Insight & Rule-based Interpretation Engine.
 * 
 * Obsolete as of Team Pulse 30-Second Check-in Redesign.
 * Automatic rule-based observations and generated prompts were removed to simplify the user
 * experience and avoid automated evaluation of participants. Replaced by a fixed facilitation prompt.
 */
import { getTotalVotes } from '../src/model.js';

export function legacyCalculateInsight(counts) {
  const total = getTotalVotes(counts);
  if (total === 0) return { ruleId: 'empty', observation: null, prompt: null };
  return { ruleId: 'legacy-retired', observation: null, prompt: null };
}
