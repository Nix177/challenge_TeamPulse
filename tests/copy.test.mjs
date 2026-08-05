import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

test('index.html contains updated session privacy copy and version query parameters', () => {
  const indexPath = path.resolve(process.cwd(), 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  // Obsolete strings must NOT exist in index.html
  assert.equal(indexContent.includes('Réponses non conservées'), false);
  assert.equal(indexContent.includes('Les réponses restent uniquement dans cette page et disparaissent lorsqu’elle est rechargée.'), false);
  assert.equal(indexContent.includes('Les réponses ne quittent pas cette page et disparaissent lorsqu’elle est rechargée.'), false);

  // New session privacy copy MUST exist in index.html
  assert.equal(indexContent.includes('Session privée'), true);
  assert.equal(indexContent.includes('Les réponses sont transmises à la session et présentées uniquement sous forme agrégée au facilitateur.'), true);
  assert.equal(indexContent.includes('Aucun nom n’est demandé. Le facilitateur ne voit que la répartition du groupe, jamais les choix individuels.'), true);

  // Cache-busting version query string MUST exist
  assert.equal(indexContent.includes('styles.css?v=20260805-session'), true);
  assert.equal(indexContent.includes('src/app.js?v=20260805-session'), true);
});
