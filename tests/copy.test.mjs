import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COPY,
  formatCollectedCount,
  formatSupportingCount,
  formatPreRevealHeading,
  formatSubmissionLiveAnnounce
} from '../src/copy.js';

test('formatCollectedCount handles singular, plural, and zero correctly', () => {
  assert.equal(formatCollectedCount(0), '0 réponse recueillie dans cette session');
  assert.equal(formatCollectedCount(1), '1 réponse recueillie dans cette session');
  assert.equal(formatCollectedCount(2), '2 réponses recueillies dans cette session');
  assert.equal(formatCollectedCount(16), '16 réponses recueillies dans cette session');
});

test('formatSupportingCount handles singular and plural', () => {
  assert.equal(formatSupportingCount(1), '1 réponse recueillie');
  assert.equal(formatSupportingCount(5), '5 réponses recueillies');
});

test('formatPreRevealHeading handles singular and plural', () => {
  assert.equal(formatPreRevealHeading(1), '1 réponse a été recueillie.');
  assert.equal(formatPreRevealHeading(4), '4 réponses ont été recueillies.');
});

test('formatSubmissionLiveAnnounce formats live region announcement', () => {
  assert.equal(formatSubmissionLiveAnnounce(1), 'Réponse comptée. 1 réponse recueillie dans cette session');
  assert.equal(formatSubmissionLiveAnnounce(7), 'Réponse comptée. 7 réponses recueillies dans cette session');
});

test('Prohibited jargon strings do not exist in normal mode COPY', () => {
  const prohibitedStrings = [
    'EXPRESSION INDIVIDUELLE',
    'CONFIRMATION',
    'RÉPONSE AJOUTÉE',
    'RÉSULTATS COLLECTIFS',
    'LE POULS DU GROUPE',
    'À OBSERVER',
    'POUR OUVRIR LA CONVERSATION',
    'Session éphémère',
    'Espace facilitateur',
    'ajouter au pouls du groupe',
    'Le pouls du groupe se construit réponse après réponse',
    'Ce que la répartition permet de constater',
    'Voici ce que le groupe a partagé'
  ];

  const copyJson = JSON.stringify(COPY);
  for (const forbidden of prohibitedStrings) {
    assert.equal(
      copyJson.includes(forbidden),
      false,
      `COPY object contains prohibited string: "${forbidden}"`
    );
  }
});
