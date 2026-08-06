import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { COPY } from '../src/copy.js';
import { CANONICAL_OPTIONS } from '../src/options.js';

test('Active voting template uses option-tile, option-label, native-radio and omits obsolete option-card markup', () => {
  const appPath = path.resolve(process.cwd(), 'src/app.js');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // Verify option-tile, option-label, native-radio
  assert.equal(appContent.includes('class="option-tile"'), true, 'Voting template must use option-tile');
  assert.equal(appContent.includes('class="option-label'), true, 'Voting template must use option-label');
  assert.equal(appContent.includes('class="native-radio"'), true, 'Voting template must use native-radio');

  // Verify radio is not hidden with sr-only
  assert.equal(appContent.includes('class="sr-only option-radio-input"'), false, 'Native radio must not be hidden with sr-only');

  // Verify obsolete option-card markup is absent
  assert.equal(appContent.includes('option-card-wrapper'), false, 'Obsolete option-card-wrapper must be absent');
  assert.equal(appContent.includes('class="option-card"'), false, 'Obsolete option-card class must be absent');
  assert.equal(appContent.includes('option-radio-visual'), false, 'Obsolete option-radio-visual must be absent');

  // Verify all 5 canonical options are present in CANONICAL_OPTIONS
  assert.equal(CANONICAL_OPTIONS.length, 5, 'All 5 canonical options must be present');
});

test('Copy handlers use copyWithFeedback helper and handle success/failure', () => {
  const appPath = path.resolve(process.cwd(), 'src/app.js');
  const appContent = fs.readFileSync(appPath, 'utf8');

  assert.equal(appContent.includes('copyWithFeedback('), true, 'Copy handlers must use copyWithFeedback helper');
  assert.equal(appContent.includes('navigator.clipboard.writeText'), true, 'Copy helper must call navigator.clipboard.writeText');
  assert.equal(COPY.facilitatorDashboard.codeCopied, 'Code copié ✓');
  assert.equal(COPY.facilitatorDashboard.linkCopied, 'Lien copié ✓');
  assert.equal(COPY.facilitatorDashboard.copyFailed, 'Copie impossible. Sélectionnez le contenu manuellement.');
});

test('Participant receipt contains manual refresh button and uses refreshParticipantRoomState', () => {
  const appPath = path.resolve(process.cwd(), 'src/app.js');
  const appContent = fs.readFileSync(appPath, 'utf8');

  assert.equal(appContent.includes('btn-refresh-participant'), true, 'Participant receipt must contain manual refresh button');
  assert.equal(appContent.includes('refreshParticipantRoomState('), true, 'Participant polling and refresh must use refreshParticipantRoomState');
  assert.equal(COPY.receipt.refreshBtnParticipant, 'Actualiser maintenant');
  assert.equal(COPY.receipt.refreshStatusWaiting, 'Les résultats ne sont pas encore affichés.');
});

test('Open facilitator dashboard and revealed results page both contain Actualiser button and handlers', () => {
  const appPath = path.resolve(process.cwd(), 'src/app.js');
  const appContent = fs.readFileSync(appPath, 'utf8');

  assert.equal(appContent.includes('btn-refresh-room'), true, 'Open facilitator dashboard must contain refresh button');
  assert.equal(appContent.includes('btn-refresh-results'), true, 'Revealed facilitator results page must contain refresh button');
  assert.equal(COPY.facilitatorDashboard.refreshBtn, 'Actualiser');
  assert.equal(COPY.results.refreshBtn, 'Actualiser');

  // Verify result refresh handler calls apiGetFacilitatorState and does NOT call apiCloseRoom
  const resultRefreshSection = appContent.slice(appContent.indexOf('btn-refresh-results'));
  assert.equal(resultRefreshSection.includes('apiGetFacilitatorState'), true, 'Result refresh must call apiGetFacilitatorState');
  assert.equal(resultRefreshSection.includes('apiCloseRoom'), false, 'Result refresh must NOT call apiCloseRoom');
});

test('Inline status CSS rules exist for restrained feedback', () => {
  const stylesPath = path.resolve(process.cwd(), 'styles.css');
  const stylesContent = fs.readFileSync(stylesPath, 'utf8');

  assert.equal(stylesContent.includes('.inline-status'), true, '.inline-status class must exist in styles.css');
  assert.equal(stylesContent.includes('.inline-status.is-error'), true, '.inline-status.is-error class must exist in styles.css');
});
