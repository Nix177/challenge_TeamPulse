import test from 'node:test';
import assert from 'node:assert/strict';
import { DISCLAIMER } from '../src/insight.js';

test('DISCLAIMER provides discreet supporting text without automated evaluations or generic prompt card', () => {
  assert.equal(DISCLAIMER, 'Un instantané du groupe, pas une évaluation.');
});
