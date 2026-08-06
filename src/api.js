import { SUPABASE_CONFIG, isBackendConfigured } from './config.js';
import { hashSha256 } from './session.js';

// Request timeout in milliseconds (8 seconds)
const REQUEST_TIMEOUT_MS = 8000;

/**
 * In-memory mock database for local development and demo mode.
 */
const mockDatabase = {
  rooms: new Map(),
  counts: new Map(),
  participants: new Map()
};

/**
 * Helper to construct an Error object enriched with diagnostic metadata.
 */
function createApiError(message, category, httpStatus, pgCode, rpcName) {
  const err = new Error(category);
  err.category = category;
  err.httpStatus = httpStatus || null;
  err.pgCode = pgCode || null;
  err.rpcName = rpcName || null;
  err.sanitizedMessage = message || category;
  return err;
}

/**
 * Performs a REST RPC request strictly to the configured Supabase endpoint with timeout and error handling.
 * 
 * SECURITY RULE: Sends the public publishable key ONLY in the `apikey` header.
 * Explicitly specifies `Content-Profile: public` for PostgREST schema selection in multi-schema projects.
 * Does NOT send a Bearer token or service-role key.
 */
async function callRpc(functionName, payload, isDemoModeCall = false) {
  if (isDemoModeCall) {
    return callMockRpc(functionName, payload);
  }

  if (!isBackendConfigured()) {
    throw createApiError('Supabase credentials are not configured', 'UNCONFIGURED_BACKEND', null, null, functionName);
  }

  const targetUrl = `${SUPABASE_CONFIG.supabaseUrl}/rest/v1/rpc/${functionName}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Profile': 'public',
        'apikey': SUPABASE_CONFIG.supabasePublishableKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson = {};
      try { errorJson = JSON.parse(errorText); } catch (_) {}
      const rawMsg = errorJson.message || errorText;
      const pgCode = errorJson.code || null;
      const status = response.status;

      // Sanitize message: strip sensitive parameters if present
      const sanitizedMsg = String(rawMsg).replace(/(?:p_admin_secret_hash|p_participant_token_hash|token|secret)\s*[:=]\s*[^\s,;]+/gi, '[REDACTED]');

      if (rawMsg.includes('ROOM_NOT_FOUND')) throw createApiError(sanitizedMsg, 'NOT_FOUND', status, pgCode, functionName);
      if (rawMsg.includes('ROOM_CLOSED')) throw createApiError(sanitizedMsg, 'CLOSED', status, pgCode, functionName);
      if (rawMsg.includes('ROOM_EXPIRED')) throw createApiError(sanitizedMsg, 'EXPIRED', status, pgCode, functionName);
      if (rawMsg.includes('ALREADY_SUBMITTED')) throw createApiError(sanitizedMsg, 'ALREADY_SUBMITTED', status, pgCode, functionName);
      if (rawMsg.includes('INVALID_ADMIN_SECRET')) throw createApiError(sanitizedMsg, 'INVALID_SECRET', status, pgCode, functionName);
      
      // Distinguish backend SQL/DB failure from network connection failure
      throw createApiError(sanitizedMsg, 'SQL_ERROR', status, pgCode, functionName);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (['UNCONFIGURED_BACKEND', 'NOT_FOUND', 'CLOSED', 'EXPIRED', 'ALREADY_SUBMITTED', 'INVALID_SECRET', 'SQL_ERROR'].includes(err.category || err.message)) {
      throw err;
    }
    // Fetch network connection failure (e.g. offline, timeout, DNS failure)
    throw createApiError(err.message || 'Fetch network request failed', 'NETWORK_ERROR', null, null, functionName);
  }
}

/**
 * Local mock RPC handler for unit testing and demo mode.
 */
export async function callMockRpc(functionName, payload) {
  await new Promise(r => setTimeout(r, 20));
  const now = new Date();

  if (functionName === 'tp_create_room') {
    const code = payload.p_code;
    const expiresAt = new Date(now.getTime() + (payload.p_duration_hours || 12) * 3600 * 1000).toISOString();
    mockDatabase.rooms.set(code, {
      code,
      admin_secret_hash: payload.p_admin_secret_hash,
      status: 'open',
      created_at: now.toISOString(),
      expires_at: expiresAt
    });
    mockDatabase.counts.set(code, {
      total: 0,
      'very-difficult': 0,
      'difficult': 0,
      'mixed': 0,
      'good': 0,
      'very-good': 0
    });
    mockDatabase.participants.set(code, new Set());
    return { success: true, code, expires_at: expiresAt };
  }

  if (functionName === 'tp_get_public_room') {
    const room = mockDatabase.rooms.get(payload.p_code);
    if (!room) throw createApiError('ROOM_NOT_FOUND', 'NOT_FOUND', 404, 'P0001', functionName);
    if (new Date(room.expires_at) < now) throw createApiError('ROOM_EXPIRED', 'EXPIRED', 400, 'P0001', functionName);
    const counts = mockDatabase.counts.get(payload.p_code);

    if (room.status === 'closed') {
      return {
        code: room.code,
        status: room.status,
        total_votes: counts ? counts.total : 0,
        counts: counts || createEmptyCounts()
      };
    }

    return {
      code: room.code,
      status: room.status,
      total_votes: counts ? counts.total : 0
    };
  }

  if (functionName === 'tp_submit_vote') {
    const code = payload.p_code;
    const room = mockDatabase.rooms.get(code);
    if (!room) throw createApiError('ROOM_NOT_FOUND', 'NOT_FOUND', 404, 'P0001', functionName);
    if (new Date(room.expires_at) < now) throw createApiError('ROOM_EXPIRED', 'EXPIRED', 400, 'P0001', functionName);
    if (room.status === 'closed') throw createApiError('ROOM_CLOSED', 'CLOSED', 400, 'P0001', functionName);

    const participantsSet = mockDatabase.participants.get(code);
    if (participantsSet.has(payload.p_participant_token_hash)) {
      throw createApiError('ALREADY_SUBMITTED', 'ALREADY_SUBMITTED', 400, '23505', functionName);
    }

    participantsSet.add(payload.p_participant_token_hash);
    const counts = mockDatabase.counts.get(code);
    const opt = payload.p_option_id;
    if (counts && counts[opt] !== undefined) {
      counts[opt] += 1;
      counts.total += 1;
    }
    return { success: true, total: counts ? counts.total : 0 };
  }

  if (functionName === 'tp_get_facilitator_room_state') {
    const code = payload.p_code;
    const room = mockDatabase.rooms.get(code);
    if (!room) throw createApiError('ROOM_NOT_FOUND', 'NOT_FOUND', 404, 'P0001', functionName);
    if (room.admin_secret_hash !== payload.p_admin_secret_hash) {
      throw createApiError('INVALID_ADMIN_SECRET', 'INVALID_SECRET', 401, 'P0001', functionName);
    }
    const counts = mockDatabase.counts.get(code);
    return {
      code: room.code,
      status: room.status,
      created_at: room.created_at,
      expires_at: room.expires_at,
      total: counts.total,
      counts: counts
    };
  }

  if (functionName === 'tp_close_room') {
    const code = payload.p_code;
    const room = mockDatabase.rooms.get(code);
    if (!room) throw createApiError('ROOM_NOT_FOUND', 'NOT_FOUND', 404, 'P0001', functionName);
    if (room.admin_secret_hash !== payload.p_admin_secret_hash) {
      throw createApiError('INVALID_ADMIN_SECRET', 'INVALID_SECRET', 401, 'P0001', functionName);
    }
    room.status = 'closed';
    return { success: true };
  }

  if (functionName === 'tp_delete_room') {
    const code = payload.p_code;
    const room = mockDatabase.rooms.get(code);
    if (!room) throw createApiError('ROOM_NOT_FOUND', 'NOT_FOUND', 404, 'P0001', functionName);
    if (room.admin_secret_hash !== payload.p_admin_secret_hash) {
      throw createApiError('INVALID_ADMIN_SECRET', 'INVALID_SECRET', 401, 'P0001', functionName);
    }
    mockDatabase.rooms.delete(code);
    mockDatabase.counts.delete(code);
    mockDatabase.participants.delete(code);
    return { success: true };
  }

  throw createApiError('UNKNOWN_RPC', 'SQL_ERROR', 400, '42883', functionName);
}

/**
 * Creates a new room on the backend via tp_create_room.
 */
export async function apiCreateRoom(code, adminSecret, durationHours = 12, isDemoMode = false) {
  const secretHash = await hashSha256(adminSecret);
  return callRpc('tp_create_room', {
    p_code: code,
    p_admin_secret_hash: secretHash,
    p_duration_hours: durationHours
  }, isDemoMode);
}

/**
 * Fetches public room status via tp_get_public_room (does NOT return option counts).
 */
export async function apiGetPublicRoom(code, isDemoMode = false) {
  return callRpc('tp_get_public_room', { p_code: code }, isDemoMode);
}

/**
 * Submits a participant vote via tp_submit_vote.
 */
export async function apiSubmitVote(code, optionId, participantToken, isDemoMode = false) {
  const tokenHash = await hashSha256(participantToken);
  return callRpc('tp_submit_vote', {
    p_code: code,
    p_option_id: optionId,
    p_participant_token_hash: tokenHash
  }, isDemoMode);
}

/**
 * Fetches detailed room state for facilitator via tp_get_facilitator_room_state.
 */
export async function apiGetFacilitatorState(code, adminSecret, isDemoMode = false) {
  const secretHash = await hashSha256(adminSecret);
  return callRpc('tp_get_facilitator_room_state', {
    p_code: code,
    p_admin_secret_hash: secretHash
  }, isDemoMode);
}

/**
 * Closes room submissions via tp_close_room.
 */
export async function apiCloseRoom(code, adminSecret, isDemoMode = false) {
  const secretHash = await hashSha256(adminSecret);
  return callRpc('tp_close_room', {
    p_code: code,
    p_admin_secret_hash: secretHash
  }, isDemoMode);
}

/**
 * Deletes room permanently via tp_delete_room.
 */
export async function apiDeleteRoom(code, adminSecret, isDemoMode = false) {
  const secretHash = await hashSha256(adminSecret);
  return callRpc('tp_delete_room', {
    p_code: code,
    p_admin_secret_hash: secretHash
  }, isDemoMode);
}
