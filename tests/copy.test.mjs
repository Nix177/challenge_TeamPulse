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

test('Prohibited informal "tu" or shared-device jargon strings do not exist in COPY', () => {
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
    'RÉSULTATS COLLECTIFS',
    ' tu ',
    ' ta ',
    ' ton '
  ];

  for (const forbidden of prohibitedStrings) {
    assert.equal(
      jsonString.includes(forbidden),
      false,
      `Prohibited string "${forbidden}" should not exist in COPY.`
    );
  }
});

test('index.html contains simplified header with Team Pulse title only', () => {
  const indexPath = path.resolve(process.cwd(), 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  // Tagline and obsolete badges must NOT exist in index.html header
  assert.equal(indexContent.includes('Prendre le pouls. Ouvrir la conversation.'), false);
  assert.equal(indexContent.includes('Session privée'), false);
  assert.equal(indexContent.includes('Espace facilitateur'), false);

  // Simplified header must contain Team Pulse title
  assert.equal(indexContent.includes('<h1 class="brand-title">Team Pulse</h1>'), true);
  assert.equal(indexContent.includes('styles.css?v=20260806-checkin'), true);
  assert.equal(indexContent.includes('src/app.js?v=20260806-checkin'), true);
});

test('Centralized 30-second check-in copy strings exist in COPY in formal French', () => {
  assert.equal(COPY.landing.heading, 'Prenez le pouls du groupe avant de commencer');
  assert.equal(COPY.landing.body, 'Un check-in de 30 secondes, sans nom, pour une réunion, un atelier ou un cours.');

  assert.equal(COPY.voting.heading, 'Comment vous sentez-vous en ce début de session ?');
  assert.equal(COPY.voting.submitBtn, 'Envoyer ma réponse');

  assert.equal(COPY.receipt.heading, 'Réponse envoyée');
  assert.equal(COPY.receipt.body, 'Votre choix a bien été enregistré.');

  assert.equal(COPY.facilitatorDashboard.heading, 'Session prête');
  assert.equal(COPY.facilitatorDashboard.step1Title, '1. Partagez le lien');
  assert.equal(COPY.facilitatorDashboard.step2Title, '2. Affichez les résultats');
  assert.equal(COPY.facilitatorDashboard.emptyState, 'En attente de la première réponse.');

  assert.equal(COPY.results.heading, 'Le groupe en ce début de session');
  assert.equal(COPY.results.disclaimer, 'Un instantané du groupe, pas une évaluation.');
});
