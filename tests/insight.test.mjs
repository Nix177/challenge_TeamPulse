import test from 'node:test';
import assert from 'node:assert/strict';
import { FACILITATION_PROMPT } from '../src/insight.js';

test('FACILITATION_PROMPT provides fixed human facilitation question without automated evaluations', () => {
  assert.equal(FACILITATION_PROMPT.heading, 'Pour ouvrir l’échange');
  assert.equal(FACILITATION_PROMPT.text, 'De quoi avons-nous besoin pour bien commencer cette session ?');
  assert.equal(FACILITATION_PROMPT.supporting, 'Un instantané du groupe, pas une évaluation.');
});
