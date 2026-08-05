import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePulsePoints,
  generateCubicPath,
  generatePulseDataVisualization
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
