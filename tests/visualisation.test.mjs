import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePulsePoints,
  generateCubicPath,
  generatePulseDataVisualization,
  generateParticipationPulse,
  renderParticipationPulseSvg
} from '../src/visualisation.js';

test('calculatePulsePoints returns 5 valid points for empty/zero percentages', () => {
  const zeroPercentages = {
    'very-difficult': 0,
    'difficult': 0,
    'mixed': 0,
    'good': 0,
    'very-good': 0
  };
  const points = calculatePulsePoints(zeroPercentages);
  assert.equal(points.length, 5);
  points.forEach(p => {
    assert.equal(typeof p.x, 'number');
    assert.equal(typeof p.y, 'number');
    assert.equal(isNaN(p.x), false);
    assert.equal(isNaN(p.y), false);
    assert.equal(p.pct, 0);
  });
});

test('calculatePulsePoints handles 1 dominant value correctly', () => {
  const dominantPercentages = {
    'very-difficult': 0,
    'difficult': 0,
    'mixed': 100,
    'good': 0,
    'very-good': 0
  };
  const points = calculatePulsePoints(dominantPercentages);
  assert.equal(points[2].pct, 100);
  // Point 2 (mixed) peak Y should be higher up (smaller numeric y value) than baseline points
  assert.ok(points[2].y < points[0].y);
});

test('calculatePulsePoints handles equal values correctly', () => {
  const equalPercentages = {
    'very-difficult': 20,
    'difficult': 20,
    'mixed': 20,
    'good': 20,
    'very-good': 20
  };
  const points = calculatePulsePoints(equalPercentages);
  assert.equal(points.length, 5);
  const firstY = points[0].y;
  points.forEach(p => {
    assert.equal(p.y, firstY);
  });
});

test('generatePulseDataVisualization generates valid SVG path without NaN or undefined', () => {
  const samplePercentages = {
    'very-difficult': 6,
    'difficult': 13,
    'mixed': 25,
    'good': 38,
    'very-good': 19
  };
  const res = generatePulseDataVisualization(samplePercentages);
  assert.equal(res.isValid, true);
  assert.equal(res.points.length, 5);
  assert.match(res.pathD, /^M \d+(\.\d+)? \d+(\.\d+)? C/);
  assert.equal(res.pathD.includes('NaN'), false);
  assert.equal(res.pathD.includes('undefined'), false);
});

test('generateParticipationPulse(0) generates clean empty baseline visual', () => {
  const res = generateParticipationPulse(0);
  assert.equal(res.total, 0);
  assert.equal(res.visibleCount, 0);
  assert.equal(res.nodes.length, 0);
  assert.equal(res.overflow.hasOverflow, false);
  assert.equal(res.isValid, true);
});

test('generateParticipationPulse(1) generates 1 centered node with highlight', () => {
  const res = generateParticipationPulse(1);
  assert.equal(res.total, 1);
  assert.equal(res.visibleCount, 1);
  assert.equal(res.nodes.length, 1);
  assert.equal(res.nodes[0].x, 250);
  assert.equal(res.nodes[0].isLatest, true);
  assert.equal(res.overflow.hasOverflow, false);
});

test('generateParticipationPulse(5) generates 5 distributed nodes', () => {
  const res = generateParticipationPulse(5);
  assert.equal(res.total, 5);
  assert.equal(res.visibleCount, 5);
  assert.equal(res.nodes.length, 5);
  assert.equal(res.nodes[4].isLatest, true);
  assert.equal(res.overflow.hasOverflow, false);
});

test('generateParticipationPulse(25) caps visible nodes at 20 and calculates +5 overflow', () => {
  const res = generateParticipationPulse(25);
  assert.equal(res.total, 25);
  assert.equal(res.visibleCount, 20);
  assert.equal(res.nodes.length, 20);
  assert.equal(res.overflow.hasOverflow, true);
  assert.equal(res.overflow.overflowCount, 5);
  assert.equal(res.overflow.text, '+5');
});

test('renderParticipationPulseSvg produces valid deterministic SVG string without NaN or undefined', () => {
  const svg0 = renderParticipationPulseSvg(0);
  assert.equal(svg0.includes('NaN'), false);
  assert.equal(svg0.includes('undefined'), false);
  assert.equal(svg0.includes('participation-pulse-svg'), true);
  assert.equal(svg0.includes('aria-hidden="true"'), true);

  const svg15 = renderParticipationPulseSvg(15);
  assert.equal(svg15.includes('pulse-node'), true);
  assert.equal(svg15.includes('pulse-node-latest'), true);
  assert.equal(svg15.includes('NaN'), false);
  assert.equal(svg15.includes('undefined'), false);
});
