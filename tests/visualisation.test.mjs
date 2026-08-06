import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePulseProfileData,
  renderCollectiveResultVisualization,
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

test('generatePulseProfileData(counts) processes 5 canonical categories in exact order and adjusts percentage sum', () => {
  const sampleCounts = {
    'very-difficult': 1,
    'difficult': 2,
    'mixed': 4,
    'good': 6,
    'very-good': 3
  };
  const data = generatePulseProfileData(sampleCounts);
  assert.equal(data.total, 16);
  assert.equal(data.isValid, true);
  assert.equal(data.categories.length, 5);
  assert.equal(data.categories[0].id, 'very-difficult');
  assert.equal(data.categories[1].id, 'difficult');
  assert.equal(data.categories[2].id, 'mixed');
  assert.equal(data.categories[3].id, 'good');
  assert.equal(data.categories[4].id, 'very-good');

  const sumPct = data.categories.reduce((acc, c) => acc + c.percentage, 0);
  assert.equal(sumPct, 100);
  assert.equal(data.ariaLabel.includes('Répartition de 16 réponses'), true);
});

test('renderCollectiveResultVisualization handles 0 responses with empty state notice', () => {
  const zeroCounts = {
    'very-difficult': 0,
    'difficult': 0,
    'mixed': 0,
    'good': 0,
    'very-good': 0
  };
  const html = renderCollectiveResultVisualization(zeroCounts);
  assert.equal(html.includes('Aucune réponse à afficher.'), true);
  assert.equal(html.includes('<svg'), false, 'Zero responses should not render a misleading empty curve');
});

test('renderCollectiveResultVisualization handles 1 response without filled curve or misleading giant rectangle', () => {
  const singleCounts = {
    'very-difficult': 0,
    'difficult': 0,
    'mixed': 0,
    'good': 1,
    'very-good': 0
  };
  const html = renderCollectiveResultVisualization(singleCounts);
  assert.equal(html.includes('<svg'), true);
  assert.equal(html.includes('pulse-single-label'), true, 'Single response should show 1 (100%) label');
  assert.equal(html.includes('pulse-profile-line'), false, '1-response mode should omit profile curve');
  assert.equal(html.includes('1 (100%)'), true);
  assert.equal(html.includes('1 · 100%'), true);
});

test('renderCollectiveResultVisualization handles stacked dots, curve, and overflow indicator for large counts', () => {
  const overflowCounts = {
    'very-difficult': 12,
    'difficult': 0,
    'mixed': 1,
    'good': 0,
    'very-good': 15
  };
  const html = renderCollectiveResultVisualization(overflowCounts);
  assert.equal(html.includes('<svg'), true);
  assert.equal(html.includes('pulse-profile-line'), true, 'Multi-response mode should render pulse curve');
  assert.equal(html.includes('+4'), true, '12 votes should render +4 overflow indicator');
  assert.equal(html.includes('+7'), true, '15 votes should render +7 overflow indicator');
  assert.equal(html.includes('12 · 43%'), true);
  assert.equal(html.includes('15 · 53%'), true);
});
