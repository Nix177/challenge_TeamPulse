import test from 'node:test';
import assert from 'node:assert/strict';
import { COPY, formatRoomResponseCount } from '../src/copy.js';

test('formatRoomResponseCount handles singular, plural, and zero correctly', () => {
  assert.equal(formatRoomResponseCount(0), '0 réponse reçue');
  assert.equal(formatRoomResponseCount(1), '1 réponse reçue');
  assert.equal(formatRoomResponseCount(2), '2 réponses reçues');
  assert.equal(formatRoomResponseCount(15), '15 réponses reçues');
});

test('Prohibited shared-device jargon strings do not exist in COPY', () => {
  const jsonString = JSON.stringify(COPY);
  const prohibitedStrings = [
    'passer l’appareil',
    'passer l\'appareil',
    'personne suivante',
    'Commencer une nouvelle réponse',
    'nouvelle réponse',
    'répétition',
    'EXPRESSION INDIVIDUELLE',
    'CONFIRMATION',
    'RÉPONSE AJOUTÉE',
    'RÉSULTATS COLLECTIFS'
  ];

  for (const forbidden of prohibitedStrings) {
    assert.equal(
      jsonString.includes(forbidden),
      false,
      `Prohibited string "${forbidden}" should not exist in COPY.`
    );
  }
});
