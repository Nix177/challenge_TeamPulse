import test from 'node:test';
import assert from 'node:assert/strict';
import {
  apiCreateRoom,
  apiGetPublicRoom,
  apiSubmitVote,
  apiGetFacilitatorState,
  apiCloseRoom,
  apiDeleteRoom
} from '../src/api.js';
import { SUPABASE_CONFIG, isBackendConfigured } from '../src/config.js';

test('Full multi-device room backend lifecycle with tp_* RPCs (create, join, submit, aggregate reveal, delete)', async () => {
  const code = 'TEST01';
  const adminSecret = 'secret12345678901234567890123456';
  const tokenParticipantA = 'token_participant_a_123456789012';
  const tokenParticipantB = 'token_participant_b_123456789012';
  const isDemo = true; // Use mock mode for automated node unit test

  // 1. Create Room via tp_create_room
  const createRes = await apiCreateRoom(code, adminSecret, 12, isDemo);
  assert.equal(createRes.success, true);
  assert.equal(createRes.code, code);

  // 2. Participant A joins room via tp_get_public_room while open
  const publicState1 = await apiGetPublicRoom(code, isDemo);
  assert.equal(publicState1.code, code);
  assert.equal(publicState1.status, 'open');
  assert.equal(publicState1.total_votes, 0);
  assert.equal(publicState1.counts, undefined, 'Public room API must NEVER expose option counts while open!');

  // 3. Participant A submits vote for 'good' via tp_submit_vote
  const voteResA = await apiSubmitVote(code, 'good', tokenParticipantA, isDemo);
  assert.equal(voteResA.success, true);
  assert.equal(voteResA.total, 1);

  // 4. Duplicate submission from Participant A is rejected
  await assert.rejects(
    async () => {
      await apiSubmitVote(code, 'very-good', tokenParticipantA, isDemo);
    },
    (err) => err.message === 'ALREADY_SUBMITTED' && err.httpStatus === 400 && err.pgCode === '23505'
  );

  // 5. Participant B submits vote for 'very-difficult'
  const voteResB = await apiSubmitVote(code, 'very-difficult', tokenParticipantB, isDemo);
  assert.equal(voteResB.success, true);
  assert.equal(voteResB.total, 2);

  // 6. Public room query while open still shows ONLY total votes = 2, NO option counts
  const publicState2 = await apiGetPublicRoom(code, isDemo);
  assert.equal(publicState2.total_votes, 2);
  assert.equal(publicState2.counts, undefined);

  // 7. Facilitator state query with INVALID secret is rejected
  await assert.rejects(
    async () => {
      await apiGetFacilitatorState(code, 'wrong_secret', isDemo);
    },
    (err) => err.message === 'INVALID_SECRET' && err.httpStatus === 401
  );

  // 8. Facilitator state query with VALID secret returns detailed option counts via tp_get_facilitator_room_state
  const facilitatorState = await apiGetFacilitatorState(code, adminSecret, isDemo);
  assert.equal(facilitatorState.code, code);
  assert.equal(facilitatorState.total, 2);
  assert.equal(facilitatorState.counts['good'], 1);
  assert.equal(facilitatorState.counts['very-difficult'], 1);

  // 9. Close Room / Reveal Results via tp_close_room
  const closeRes = await apiCloseRoom(code, adminSecret, isDemo);
  assert.equal(closeRes.success, true);

  // 10. Public room query after reveal returns status 'closed' AND aggregated counts
  const publicStateRevealed = await apiGetPublicRoom(code, isDemo);
  assert.equal(publicStateRevealed.status, 'closed');
  assert.equal(publicStateRevealed.total_votes, 2);
  assert.ok(publicStateRevealed.counts, 'Public room API must include aggregated counts once revealed');
  assert.equal(publicStateRevealed.counts['good'], 1);

  // 11. New vote after room closure is rejected
  await assert.rejects(
    async () => {
      await apiSubmitVote(code, 'good', 'token_participant_c', isDemo);
    },
    (err) => err.message === 'CLOSED' && err.httpStatus === 400
  );

  // 12. Delete Room via tp_delete_room
  const deleteRes = await apiDeleteRoom(code, adminSecret, isDemo);
  assert.equal(deleteRes.success, true);

  // 13. Querying deleted room returns NOT_FOUND
  await assert.rejects(
    async () => {
      await apiGetPublicRoom(code, isDemo);
    },
    (err) => err.message === 'NOT_FOUND' && err.httpStatus === 404
  );
});

test('Backend configuration validation and property naming', () => {
  assert.equal(isBackendConfigured(), true, 'Configured backend credentials must return true');
  assert.equal(typeof SUPABASE_CONFIG.supabasePublishableKey, 'string');
  assert.equal(SUPABASE_CONFIG.supabasePublishableKey.startsWith('sb_publishable_'), true);
});
