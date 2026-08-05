import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateRoomCode,
  normalizeRoomCode,
  isValidRoomCode,
  generateAdminSecret,
  hashSha256,
  getOrCreateParticipantToken,
  buildParticipantUrl,
  buildFacilitatorUrl
} from '../src/session.js';

// Setup node global sessionStorage mock for tests if window/sessionStorage is undefined
if (typeof globalThis.sessionStorage === 'undefined') {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

test('generateRoomCode produces valid 6-character uppercase unambiguous code', () => {
  const code = generateRoomCode();
  assert.equal(code.length, 6);
  assert.equal(isValidRoomCode(code), true);
  // Unambiguous alphabet should not contain '0', '1', 'I', 'O', 'L'
  assert.equal(/[01IOL]/.test(code), false);
});

test('normalizeRoomCode trims, converts to uppercase, and strips whitespace and hyphens', () => {
  assert.equal(normalizeRoomCode(' k7m-4pq '), 'K7M4PQ');
  assert.equal(normalizeRoomCode('k7m 4pq'), 'K7M4PQ');
  assert.equal(normalizeRoomCode('  ab-cd-ef '), 'ABCDEF');
});

test('isValidRoomCode rejects invalid length or ambiguous characters', () => {
  assert.equal(isValidRoomCode('K7M4PQ'), true);
  assert.equal(isValidRoomCode('k7m4pq'), false, 'Must be uppercase');
  assert.equal(isValidRoomCode('K7M4P'), false, 'Must be 6 characters');
  assert.equal(isValidRoomCode('K7M4PQ99'), false, 'Must be 6 characters');
  assert.equal(isValidRoomCode('K7M4P0'), false, 'Rejects 0');
  assert.equal(isValidRoomCode('K7M4P1'), false, 'Rejects 1');
  assert.equal(isValidRoomCode('K7M4PI'), false, 'Rejects I');
  assert.equal(isValidRoomCode('K7M4PO'), false, 'Rejects O');
});

test('hashSha256 produces deterministic 64-character hex string', async () => {
  const hash1 = await hashSha256('demosecret123');
  const hash2 = await hashSha256('demosecret123');
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
  assert.equal(/^[a-f0-9]{64}$/.test(hash1), true);
});

test('getOrCreateParticipantToken creates and persists room-scoped token', () => {
  sessionStorage.clear();
  const token1 = getOrCreateParticipantToken('K7M4PQ');
  assert.equal(typeof token1, 'string');
  assert.equal(token1.length, 32);

  const token2 = getOrCreateParticipantToken('K7M4PQ');
  assert.equal(token1, token2, 'Must return same token for same room');

  const tokenOtherRoom = getOrCreateParticipantToken('OTHER6');
  assert.notEqual(token1, tokenOtherRoom, 'Different room gets different token');
});

test('buildParticipantUrl NEVER contains admin secret', () => {
  const code = 'K7M4PQ';
  const participantUrl = buildParticipantUrl(code);
  assert.equal(participantUrl.includes('room=K7M4PQ'), true);
  assert.equal(participantUrl.includes('#admin='), false, 'Participant URL must NEVER contain admin secret');
  assert.equal(participantUrl.includes('admin'), false);
});

test('buildFacilitatorUrl includes room code and #admin=<secret> in URL fragment', () => {
  const code = 'K7M4PQ';
  const secret = '3a9f4c8e120000000000000000000000';
  const facilitatorUrl = buildFacilitatorUrl(code, secret);
  assert.equal(facilitatorUrl.includes('room=K7M4PQ'), true);
  assert.equal(facilitatorUrl.includes('#admin=3a9f4c8e120000000000000000000000'), true);
});
