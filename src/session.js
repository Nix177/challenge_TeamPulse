/**
 * Session Security & Cryptography Utilities — Team Pulse
 * 
 * Provides 6-character unambiguous room code generation, Web Crypto SHA-256 hashing,
 * non-identifying participant token management, and URL fragment helpers.
 */

// Unambiguous 31-character uppercase alphabet (excludes 0, 1, I, O, L)
const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generates a random 6-character uppercase room code.
 * @returns {string} E.g., 'K7M4PQ'
 */
export function generateRoomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

/**
 * Normalizes a room code input (trims, converts to uppercase, removes spaces/hyphens).
 * @param {string} rawCode 
 * @returns {string}
 */
export function normalizeRoomCode(rawCode) {
  if (typeof rawCode !== 'string') return '';
  return rawCode.trim().toUpperCase().replace(/[\s-]/g, '');
}

/**
 * Validates whether a normalized string is a valid 6-character room code.
 * @param {string} code 
 * @returns {boolean}
 */
export function isValidRoomCode(code) {
  if (typeof code !== 'string' || code.length !== 6) return false;
  return /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(code);
}

/**
 * Generates a high-entropy 32-character hex secret for facilitator administration.
 * @returns {string}
 */
export function generateAdminSecret() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes the SHA-256 hash of a string using browser Web Crypto API.
 * @param {string} message 
 * @returns {Promise<string>} Hex representation of SHA-256 hash
 */
export async function hashSha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Retrieves or creates a non-identifying random participant token stored strictly in sessionStorage.
 * @param {string} roomCode 
 * @returns {string}
 */
export function getOrCreateParticipantToken(roomCode) {
  if (typeof sessionStorage === 'undefined') return 'mock_token_node_env';
  const key = `tp_participant_token_${roomCode}`;
  let token = sessionStorage.getItem(key);
  if (!token) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    token = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(key, token);
  }
  return token;
}

/**
 * Extracts administration secret from the URL hash fragment (#admin=<secret>).
 * @returns {string|null}
 */
export function getAdminSecretFromUrl() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes('admin=')) return null;
  const match = hash.match(/admin=([a-fA-F0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Extracts room code from URL search params (?room=K7M4PQ).
 * @returns {string|null}
 */
export function getRoomCodeFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('room');
  if (!raw) return null;
  const normalized = normalizeRoomCode(raw);
  return isValidRoomCode(normalized) ? normalized : null;
}

/**
 * Builds the full participant shareable URL (contains only room code, NEVER admin secret).
 * @param {string} roomCode 
 * @param {string} [baseUrl]
 * @returns {string}
 */
export function buildParticipantUrl(roomCode, baseUrl = (typeof window !== 'undefined' ? window.location.href : 'http://localhost:4173/')) {
  const url = new URL(baseUrl);
  url.search = `?room=${roomCode}`;
  url.hash = '';
  return url.toString();
}

/**
 * Builds the facilitator dashboard URL (includes room code and #admin=<secret> in fragment).
 * @param {string} roomCode 
 * @param {string} adminSecret 
 * @param {string} [baseUrl]
 * @returns {string}
 */
export function buildFacilitatorUrl(roomCode, adminSecret, baseUrl = (typeof window !== 'undefined' ? window.location.href : 'http://localhost:4173/')) {
  const url = new URL(baseUrl);
  url.search = `?room=${roomCode}`;
  url.hash = `#admin=${adminSecret}`;
  return url.toString();
}
