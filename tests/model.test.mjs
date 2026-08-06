import test from 'node:test';
import assert from 'node:assert/strict';
import { CANONICAL_OPTIONS, OPTION_IDS, DEMO_COUNTS } from '../src/options.js';
import {
  createEmptyCounts,
  getTotalVotes,
  addVote,
  getPercentages,
  createDemoCounts,
  formatTotalResponsesFrench
} from '../src/model.js';

test('Canonical options exist in exact order with expected IDs and labels', () => {
  assert.equal(CANONICAL_OPTIONS.length, 5);
  const expected = [
    { id: 'very-difficult', label: 'Pas bien du tout' },
    { id: 'difficult', label: 'Pas très bien' },
    { id: 'mixed', label: 'Mitigé' },
    { id: 'good', label: 'Plutôt bien' },
    { id: 'very-good', label: 'Très bien' }
  ];
  expected.forEach((exp, idx) => {
    assert.equal(CANONICAL_OPTIONS[idx].id, exp.id);
    assert.equal(CANONICAL_OPTIONS[idx].label, exp.label);
  });
  assert.deepEqual(OPTION_IDS, ['very-difficult', 'difficult', 'mixed', 'good', 'very-good']);
});

test('createEmptyCounts returns 0 for all options', () => {
  const empty = createEmptyCounts();
  assert.equal(getTotalVotes(empty), 0);
  OPTION_IDS.forEach(id => {
    assert.equal(empty[id], 0);
  });
});

test('addVote creates immutable updated state for valid option', () => {
  const initial = createEmptyCounts();
  const next1 = addVote(initial, 'good');

  assert.equal(initial['good'], 0, 'Initial state must remain unchanged');
  assert.equal(next1['good'], 1, 'Updated state must increment vote count');
  assert.equal(getTotalVotes(next1), 1);

  const next2 = addVote(next1, 'good');
  assert.equal(next1['good'], 1);
  assert.equal(next2['good'], 2);
  assert.equal(getTotalVotes(next2), 2);
});

test('addVote rejects invalid option ID', () => {
  const initial = createEmptyCounts();
  assert.throws(() => {
    addVote(initial, 'invalid-id');
  }, /Invalid option ID/);
});

test('Multiple votes accumulate correctly across options', () => {
  let counts = createEmptyCounts();
  counts = addVote(counts, 'very-difficult');
  counts = addVote(counts, 'difficult');
  counts = addVote(counts, 'difficult');
  counts = addVote(counts, 'mixed');
  counts = addVote(counts, 'good');
  counts = addVote(counts, 'very-good');

  assert.equal(counts['very-difficult'], 1);
  assert.equal(counts['difficult'], 2);
  assert.equal(counts['mixed'], 1);
  assert.equal(counts['good'], 1);
  assert.equal(counts['very-good'], 1);
  assert.equal(getTotalVotes(counts), 6);
});

test('getPercentages handles zero total and valid total rounding', () => {
  const empty = createEmptyCounts();
  const zeroPct = getPercentages(empty);
  OPTION_IDS.forEach(id => assert.equal(zeroPct[id], 0));

  // Demo counts: 1, 2, 4, 6, 3 (Total = 16)
  const demo = createDemoCounts();
  const demoPct = getPercentages(demo);
  assert.equal(getTotalVotes(demo), 16);
  assert.equal(demoPct['very-difficult'], Math.round((1 / 16) * 100)); // 6%
  assert.equal(demoPct['difficult'], Math.round((2 / 16) * 100));     // 13%
  assert.equal(demoPct['mixed'], Math.round((4 / 16) * 100));         // 25%
  assert.equal(demoPct['good'], Math.round((6 / 16) * 100));          // 38%
  assert.equal(demoPct['very-good'], Math.round((3 / 16) * 100));     // 19%
});

test('formatTotalResponsesFrench correctly handles singular and plural', () => {
  assert.equal(formatTotalResponsesFrench(0), '0 réponse enregistrée');
  assert.equal(formatTotalResponsesFrench(1), '1 réponse enregistrée');
  assert.equal(formatTotalResponsesFrench(2), '2 réponses enregistrées');
  assert.equal(formatTotalResponsesFrench(16), '16 réponses enregistrées');
});

test('No duplicated canonical labels exist', () => {
  const labels = CANONICAL_OPTIONS.map(o => o.label);
  const uniqueLabels = new Set(labels);
  assert.equal(labels.length, uniqueLabels.size);
});
