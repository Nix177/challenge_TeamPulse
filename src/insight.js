import { COPY } from './copy.js';

/**
 * Fixed facilitation prompt for collective result reflection.
 * Replaces automatic rule-based interpretations with a single human reflection prompt.
 */
export const FACILITATION_PROMPT = Object.freeze({
  heading: COPY.results.facilitationPromptHeading,
  text: COPY.results.facilitationPromptText,
  supporting: COPY.results.facilitationPromptSub
});
