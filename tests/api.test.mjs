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

test('Full multi-device room backend lifecycle (create, join, submit, aggregate reveal, delete)', async () => {
  const code = 'TEST01';
  const adminSecret = 'secret12345678901234567890123456';
  const tokenParticipantA = 'token_participant_a_123456789012';
  const tokenParticipantB = 'token_participant_b_123456789012';

  // 1. Create Room
  const createRes = await apiCreateRoom(code, adminSecret, 12);
  assert.equal(createRes.success, true);
  assert.equal(createRes.code, code);

  // 2. Participant A joins room (Public room state)
  const publicState1 = await apiGetPublicRoom(code);
  assert.equal(publicState1.code, code);
  assert.equal(publicState1.status, 'open');
  assert.equal(publicState1.total_votes, 0);
  assert.equal(publicState1.counts, undefined, 'Public room API must NEVER expose option counts!');

  // 3. Participant A submits vote for 'good'
  const voteResA = await apiSubmitVote(code, 'good', tokenParticipantA);
  assert.equal(voteResA.success, true);
  assert.equal(voteResA.total, 1);

  // 4. Duplicate submission from Participant A is rejected
  await assert.rejects(
    async () => {
      await apiSubmitVote(code, 'very-good', tokenParticipantA);
    },
    (err) => err.message === 'ALREADY_SUBMITTED'
  );

  // 5. Participant B submits vote for 'very-difficult'
  const voteResB = await apiSubmitVote(code, 'very-difficult', tokenParticipantB);
  assert.equal(voteResB.success, true);
  assert.equal(voteResB.total, 2);

  // 6. Public room query still shows ONLY total votes = 2, NO option counts
  const publicState2 = await apiGetPublicRoom(code);
  assert.equal(publicState2.total_votes, 2);
  assert.equal(publicState2.counts, undefined);

  // 7. Facilitator state query with INVALID secret is rejected
  await assert.rejects(
    async () => {
      await apiGetFacilitatorState(code, 'wrong_secret');
    },
    (err) => err.message === 'INVALID_SECRET'
  );

  // 8. Facilitator state query with VALID secret returns detailed option counts
  const facilitatorState = await apiGetFacilitatorState(code, adminSecret);
  assert.equal(facilitatorState.code, code);
  assert.equal(facilitatorState.total, 2);
  assert.equal(facilitatorState.counts['good'], 1);
  assert.equal(facilitatorState.counts['very-difficult'], 1);
  assert.equal(facilitatorState.counts['mixed'], 0);

  // 9. Close Room
  const closeRes = await apiCloseRoom(code, adminSecret);
  assert.equal(closeRes.success, true);

  // 10. New vote after room closure is rejected
  await assert.rejects(
    async () => {
      await apiSubmitVote(code, 'good', 'token_participant_c');
    },
    (err) => err.message === 'CLOSED'
  );

  // 11. Delete Room
  const deleteRes = await apiDeleteRoom(code, adminSecret);
  assert.equal(deleteRes.success, true);

  // 12. Querying deleted room returns NOT_FOUND
  await assert.rejects(
    async () => {
      await apiGetPublicRoom(code);
    },
    (err) => err.message === 'NOT_FOUND'
  );
});
