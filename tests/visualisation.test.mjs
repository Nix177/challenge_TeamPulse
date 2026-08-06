import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateStackedBarVisualization,
  hasValidCounts
} from '../src/visualisation.js';

test('hasValidCounts correctly validates genuine zero counts, valid counts, and rejects missing/malformed objects', () => {
  const genuineZero = {
    'very-difficult': 0,
    'difficult': 0,
    'mixed': 0,
    'good': 0,
    'very-good': 0
  };
  assert.equal(hasValidCounts(genuineZero), true, 'Genuine zero counts object must be valid');

  const validCounts = {
    'very-difficult': 1,
    'difficult': 2,
    'mixed': 4,
    'good': 6,
    'very-good': 3
  };
  assert.equal(hasValidCounts(validCounts), true, 'Valid populated counts object must be valid');

  assert.equal(hasValidCounts(null), false);
  assert.equal(hasValidCounts(undefined), false);
  assert.equal(hasValidCounts({}), false);

  const incompleteCounts = {
    'very-difficult': 1,
    'difficult': 2,
    'mixed': 4,
    'good': 6
  };
  assert.equal(hasValidCounts(incompleteCounts), false, 'Counts missing a key must be invalid');

  const malformedCounts = {
    'very-difficult': 1,
    'difficult': 'invalid',
    'mixed': 4,
    'good': 6,
    'very-good': 3
  };
  assert.equal(hasValidCounts(malformedCounts), false, 'Counts with non-numeric property must be invalid');
});

test('generateStackedBarVisualization(counts) handles 0 total responses cleanly', () => {
  const zeroCounts = {
    'very-difficult': 0,
    'difficult': 0,
    'mixed': 0,
    'good': 0,
    'very-good': 0
  };
  const res = generateStackedBarVisualization(zeroCounts);
  assert.equal(res.total, 0);
  assert.equal(res.segments.length, 5);
  assert.equal(res.isValid, true);
  res.segments.forEach(s => {
    assert.equal(s.count, 0);
    assert.equal(s.percentage, 0);
  });
});

test('generateStackedBarVisualization(counts) handles 1 response correctly', () => {
  const singleCounts = {
    'very-difficult': 0,
    'difficult': 0,
    'mixed': 0,
    'good': 1,
    'very-good': 0
  };
  const res = generateStackedBarVisualization(singleCounts);
  assert.equal(res.total, 1);
  assert.equal(res.segments.find(s => s.id === 'good').percentage, 100);
  assert.equal(res.segments.find(s => s.id === 'good').count, 1);
});

test('generateStackedBarVisualization(counts) handles equal distributions and rounds to 100%', () => {
  const equalCounts = {
    'very-difficult': 2,
    'difficult': 2,
    'mixed': 2,
    'good': 2,
    'very-good': 2
  };
  const res = generateStackedBarVisualization(equalCounts);
  assert.equal(res.total, 10);
  const sumPct = res.segments.reduce((acc, s) => acc + s.percentage, 0);
  assert.equal(sumPct, 100);
  res.segments.forEach(s => {
    assert.equal(s.count, 2);
    assert.equal(s.percentage, 20);
  });
});

test('generateStackedBarVisualization(counts) contains all 5 canonical options in exact order without NaN or undefined', () => {
  const sampleCounts = {
    'very-difficult': 1,
    'difficult': 2,
    'mixed': 4,
    'good': 6,
    'very-good': 3
  };
  const res = generateStackedBarVisualization(sampleCounts);
  assert.equal(res.total, 16);
  assert.equal(res.isValid, true);
  assert.equal(res.segments.length, 5);
  assert.equal(res.segments[0].id, 'very-difficult');
  assert.equal(res.segments[1].id, 'difficult');
  assert.equal(res.segments[2].id, 'mixed');
  assert.equal(res.segments[3].id, 'good');
  assert.equal(res.segments[4].id, 'very-good');

  const sumPct = res.segments.reduce((acc, s) => acc + s.percentage, 0);
  assert.equal(sumPct, 100);
});
