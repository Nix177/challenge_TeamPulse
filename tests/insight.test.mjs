import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInsight, DISCLAIMER_TEXT } from '../src/insight.js';
import { createEmptyCounts, createDemoCounts } from '../src/model.js';

test('calculateInsight for 0 responses returns empty state message and no observation', () => {
  const empty = createEmptyCounts();
  const res = calculateInsight(empty);
  assert.equal(res.ruleId, 'empty');
  assert.equal(res.observation, null);
  assert.equal(res.prompt, null);
  assert.match(res.emptyMessage, /Le groupe doit d'abord contribuer/);
  assert.equal(res.disclaimer, DISCLAIMER_TEXT);
});

test('Rule 1 — support: negativeShare >= 0.5', () => {
  // 5 negative out of 8 total = 0.625 (>= 0.5)
  const counts = {
    'very-difficult': 3,
    'difficult': 2,
    'mixed': 1,
    'good': 1,
    'very-good': 1
  };
  const res = calculateInsight(counts);
  assert.equal(res.ruleId, 'support');
  assert.equal(res.observation, 'Une part importante du groupe rencontre des difficultés.');
  assert.equal(res.prompt, 'Qu’est-ce qui pèse le plus aujourd’hui, et quel petit soutien serait immédiatement utile ?');
});

test('Rule 2 — contrast: negativeShare >= 0.25 && positiveShare >= 0.25', () => {
  // 3 negative, 3 positive, 2 mixed = 8 total. negShare = 3/8 = 0.375, posShare = 3/8 = 0.375
  const counts = {
    'very-difficult': 2,
    'difficult': 1,
    'mixed': 3,
    'good': 1,
    'very-good': 1
  };
  const res = calculateInsight(counts);
  assert.equal(res.ruleId, 'contrast');
  assert.equal(res.observation, 'Les ressentis sont particulièrement contrastés.');
  assert.equal(res.prompt, 'Qu’est-ce qui pourrait expliquer que les personnes vivent cette situation différemment ?');
});

test('Rule 3 — preserve: positiveShare >= 0.55', () => {
  // 6 positive out of 10 total = 0.6 (>= 0.55), negShare = 2/10 = 0.2 (< 0.25)
  const counts = {
    'very-difficult': 1,
    'difficult': 1,
    'mixed': 2,
    'good': 4,
    'very-good': 2
  };
  const res = calculateInsight(counts);
  assert.equal(res.ruleId, 'preserve');
  assert.equal(res.observation, 'Le ressenti général est plutôt positif.');
  assert.equal(res.prompt, 'Qu’est-ce qui fonctionne bien actuellement et que le groupe devrait préserver ?');
});

test('Rule 4 — small improvement: fallback when no rule matches', () => {
  // 2 neg out of 10 = 0.20 (<0.25 negShare), 5 pos out of 10 = 0.50 (<0.55 posShare), 3 mixed
  const counts = {
    'very-difficult': 1,
    'difficult': 1,
    'mixed': 3,
    'good': 3,
    'very-good': 2
  };
  const res = calculateInsight(counts);
  assert.equal(res.ruleId, 'small-improvement');
  assert.equal(res.observation, 'Aucun ressenti ne domine clairement.');
  assert.equal(res.prompt, 'Quel petit changement concret pourrait améliorer la prochaine session ?');
});

test('Rule priority order verification: Rule 1 (support) overrides Rule 2 (contrast)', () => {
  // 5 neg out of 10 = 0.5 (meets Rule 1), 3 pos out of 10 = 0.3 (meets Rule 2 neg>=0.25 & pos>=0.25)
  // Rule 1 MUST win because it has higher priority.
  const counts = {
    'very-difficult': 3,
    'difficult': 2,
    'mixed': 2,
    'good': 2,
    'very-good': 1
  };
  const res = calculateInsight(counts);
  assert.equal(res.ruleId, 'support', 'Rule 1 (support) must take priority over Rule 2 (contrast)');
});

test('Rule priority order verification: Rule 2 (contrast) overrides Rule 3 (preserve)', () => {
  // 3 neg out of 10 = 0.30 (meets neg >= 0.25), 6 pos out of 10 = 0.60 (meets pos >= 0.25 AND meets Rule 3 pos >= 0.55)
  // Rule 2 MUST win because it has higher priority than Rule 3.
  const counts = {
    'very-difficult': 2,
    'difficult': 1,
    'mixed': 1,
    'good': 4,
    'very-good': 2
  };
  const res = calculateInsight(counts);
  assert.equal(res.ruleId, 'contrast', 'Rule 2 (contrast) must take priority over Rule 3 (preserve)');
});

test('Demo data evaluates to Rule 3 (preserve)', () => {
  const demo = createDemoCounts(); // 1, 2, 4, 6, 3 (Total = 16)
  // negShare = 3/16 = 0.1875 (< 0.25)
  // posShare = 9/16 = 0.5625 (>= 0.55) -> Rule 3 preserve!
  const res = calculateInsight(demo);
  assert.equal(res.ruleId, 'preserve');
});
