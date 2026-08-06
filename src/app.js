import { CANONICAL_OPTIONS } from './options.js';
import {
  createEmptyCounts,
  getTotalVotes,
  createDemoCounts
} from './model.js';
import {
  COPY,
  formatRoomResponseCount
} from './copy.js';
import {
  generatePulseProfileData,
  renderCollectiveResultVisualization,
  hasValidCounts
} from './visualisation.js';
import {
  generateRoomCode,
  normalizeRoomCode,
  isValidRoomCode,
  generateAdminSecret,
  getOrCreateParticipantToken,
  getAdminSecretFromUrl,
  getRoomCodeFromUrl,
  buildParticipantUrl,
  buildFacilitatorUrl
} from './session.js';
import {
  apiCreateRoom,
  apiGetPublicRoom,
  apiSubmitVote,
  apiGetFacilitatorState,
  apiCloseRoom,
  apiDeleteRoom
} from './api.js';
import { isBackendConfigured } from './config.js';

/* Abstract SVG symbols for canonical options */
const OPTION_SYMBOLS = {
  'very-difficult': `<svg class="option-symbol-glyph" viewBox="0 0 24 24" fill="none" stroke="var(--tone-1)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 3 16 Q 8 6 12 16 T 21 16"/></svg>`,
  'difficult': `<svg class="option-symbol-glyph" viewBox="0 0 24 24" fill="none" stroke="var(--tone-2)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 4 18 L 20 6 M 4 12 H 12"/></svg>`,
  'mixed': `<svg class="option-symbol-glyph" viewBox="0 0 24 24" fill="none" stroke="var(--tone-3)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="12" x2="20" y2="12"/><circle cx="7" cy="7" r="2" fill="var(--tone-3)"/><circle cx="17" cy="17" r="2" fill="var(--tone-3)"/></svg>`,
  'good': `<svg class="option-symbol-glyph" viewBox="0 0 24 24" fill="none" stroke="var(--tone-4)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 3 16 Q 10 4 21 12"/></svg>`,
  'very-good': `<svg class="option-symbol-glyph" viewBox="0 0 24 24" fill="none" stroke="var(--tone-5)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 2 18 Q 8 10 14 4 T 22 8 M 14 18 V 14"/></svg>`
};

/* Application State */
let activeRoomCode = getRoomCodeFromUrl();
let activeAdminSecret = getAdminSecretFromUrl();
let roomStatus = 'open'; // 'open' | 'closed'
let roomTotalVotes = 0;
let roomCounts = createEmptyCounts();
let selectedOptionId = null;
let userSubmittedOptionId = null;
let participantReturnedTotal = 0;
let isSmallGroupConfirmOpen = false;

// UI States: 'landing' | 'unconfigured' | 'voting' | 'receipt' | 'facilitator-dashboard' | 'facilitator-revealed' | 'facilitator-delete-confirm'
let uiState = 'landing';
let errorMessage = null;
let pollTimerId = null;
let receiptPollTimerId = null;

/* URL Mode Flags */
const searchParams = new URLSearchParams(window.location.search);
const isDemoMode = searchParams.get('demo') === '1';

/* DOM Elements */
const viewCardEl = document.getElementById('view-card');
const ariaAnnounceEl = document.getElementById('aria-announce');
const demoContainerEl = document.getElementById('demo-container');

/**
 * Announces message to screen readers via ARIA live region.
 */
function announce(msg) {
  if (ariaAnnounceEl) {
    ariaAnnounceEl.textContent = msg;
  }
}

/**
 * Focuses heading or container for accessible keyboard navigation.
 */
function focusCardHeading() {
  requestAnimationFrame(() => {
    const heading = viewCardEl.querySelector('h2, legend, h3');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    } else {
      viewCardEl.focus();
    }
  });
}

/**
 * Stops dashboard polling timer.
 */
function stopPolling() {
  if (pollTimerId) {
    clearInterval(pollTimerId);
    pollTimerId = null;
  }
}

/**
 * Stops receipt polling timer.
 */
function stopReceiptPolling() {
  if (receiptPollTimerId) {
    clearInterval(receiptPollTimerId);
    receiptPollTimerId = null;
  }
}

/**
 * Stops all active background timers.
 */
function stopAllPolling() {
  stopPolling();
  stopReceiptPolling();
}

/**
 * Starts dashboard polling timer (~5s interval).
 */
function startPolling() {
  stopPolling();
  if (isDemoMode) return;

  pollTimerId = setInterval(async () => {
    if (document.hidden || uiState !== 'facilitator-dashboard' || !activeRoomCode || !activeAdminSecret) return;
    try {
      const state = await apiGetFacilitatorState(activeRoomCode, activeAdminSecret, isDemoMode);
      roomTotalVotes = state.total;
      roomStatus = state.status;
      if (state.counts) roomCounts = state.counts;
      renderDashboardStats();
    } catch (_) {}
  }, 5000);
}

/**
 * Copies text to clipboard with button label feedback and inline status display.
 */
async function copyWithFeedback(buttonEl, textToCopy, successText, statusElId = 'facilitator-copy-status') {
  const statusEl = document.getElementById(statusElId);
  const originalText = buttonEl.textContent;
  try {
    await navigator.clipboard.writeText(textToCopy);
    buttonEl.textContent = successText;
    announce(successText);
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.classList.remove('is-error');
    }
    setTimeout(() => {
      if (buttonEl && buttonEl.textContent === successText) {
        buttonEl.textContent = originalText;
      }
    }, 2000);
  } catch (_) {
    if (statusEl) {
      statusEl.textContent = COPY.facilitatorDashboard.copyFailed;
      statusEl.classList.add('is-error');
    }
  }
}

/**
 * Reusable helper to refresh room state for participant.
 * Used by both background polling and manual refresh button.
 */
async function refreshParticipantRoomState() {
  if (!activeRoomCode) return { state: 'error' };
  try {
    const pub = await apiGetPublicRoom(activeRoomCode, isDemoMode);
    participantReturnedTotal = pub.total_votes;
    roomStatus = pub.status;

    if (hasValidCounts(pub.counts)) {
      roomCounts = pub.counts;
      roomTotalVotes = pub.total_votes;
      roomStatus = 'closed';
      stopReceiptPolling();
      render();
      return { state: 'revealed' };
    }

    if (pub.status === 'closed') {
      render();
      return { state: 'closed-unavailable' };
    }

    return { state: 'waiting' };
  } catch (err) {
    if (err.message === 'EXPIRED' || err.message === 'NOT_FOUND') {
      stopReceiptPolling();
    }
    throw err;
  }
}

/**
 * Starts participant receipt polling timer (~5s interval).
 */
function startReceiptPolling() {
  stopReceiptPolling();
  if (isDemoMode || !activeRoomCode) return;

  receiptPollTimerId = setInterval(async () => {
    if (document.hidden || uiState !== 'receipt' || !activeRoomCode) return;
    try {
      await refreshParticipantRoomState();
      const offlineStatusEl = document.getElementById('receipt-offline-status');
      if (offlineStatusEl) offlineStatusEl.textContent = '';
    } catch (err) {
      const offlineStatusEl = document.getElementById('receipt-offline-status');
      if (offlineStatusEl) {
        offlineStatusEl.innerHTML = `<p class="action-microcopy" style="margin-top: 0.5rem;">${COPY.receipt.offlineNotice}</p>`;
      }
    }
  }, 5000);
}

/**
 * Updates dynamic dashboard response count display without full re-render.
 */
function renderDashboardStats() {
  const countEl = document.getElementById('facilitator-live-count');
  const revealBtn = document.getElementById('btn-reveal-results');

  if (countEl) {
    const text = roomTotalVotes > 0 ? formatRoomResponseCount(roomTotalVotes) : COPY.facilitatorDashboard.emptyState;
    if (countEl.textContent !== text) {
      countEl.textContent = text;
      announce(text);
    }
  }

  if (revealBtn) {
    revealBtn.disabled = roomTotalVotes <= 0;
  }
}

/**
 * Initialize URL Routing & Demo Panel
 */
async function initApp() {
  if (isDemoMode) {
    demoContainerEl.innerHTML = `
      <div class="demo-bar">
        <div>
          <span class="demo-badge-tag">${COPY.demo.badge}</span>
          <strong>${COPY.demo.heading}</strong> — ${COPY.demo.body}
        </div>
        <button id="btn-load-demo" class="btn btn-secondary btn-sm">
          ${COPY.demo.actionBtn}
        </button>
      </div>
    `;

    document.getElementById('btn-load-demo').addEventListener('click', () => {
      activeRoomCode = 'DEMO16';
      activeAdminSecret = 'demosecret123';
      roomCounts = createDemoCounts();
      roomTotalVotes = getTotalVotes(roomCounts);
      roomStatus = 'closed';
      uiState = 'facilitator-revealed';
      announce(COPY.demo.loadedAnnounce);
      render();
      focusCardHeading();
    });
  }

  // If facilitator URL with room & admin secret, navigate to facilitator dashboard
  if (activeRoomCode && activeAdminSecret) {
    if (!isDemoMode && !isBackendConfigured()) {
      uiState = 'unconfigured';
      render();
      return;
    }

    try {
      const state = await apiGetFacilitatorState(activeRoomCode, activeAdminSecret, isDemoMode);
      roomStatus = state.status;
      roomTotalVotes = state.total;
      if (state.counts) roomCounts = state.counts;
      uiState = state.status === 'closed' ? 'facilitator-revealed' : 'facilitator-dashboard';
    } catch (err) {
      if (err.message === 'UNCONFIGURED_BACKEND') {
        uiState = 'unconfigured';
      } else {
        errorMessage = COPY.landing.errors.notFound;
        uiState = 'landing';
      }
    }
  } 
  // If participant URL with room code only, navigate to participant voting flow
  else if (activeRoomCode) {
    if (!isDemoMode && !isBackendConfigured()) {
      uiState = 'unconfigured';
      render();
      return;
    }

    try {
      const pub = await apiGetPublicRoom(activeRoomCode, isDemoMode);
      roomStatus = pub.status;
      roomTotalVotes = pub.total_votes;
      if (pub.counts) {
        roomCounts = pub.counts;
        uiState = 'receipt';
      } else {
        uiState = 'voting';
      }
    } catch (err) {
      if (err.message === 'UNCONFIGURED_BACKEND') {
        uiState = 'unconfigured';
      } else if (err.message === 'EXPIRED') {
        errorMessage = COPY.landing.errors.expired;
        uiState = 'landing';
      } else {
        errorMessage = COPY.landing.errors.notFound;
        uiState = 'landing';
      }
    }
  }

  render();
}

/**
 * View 1: Room Selection / Landing Screen
 */
function renderLandingView() {
  viewCardEl.innerHTML = `
    <h2 class="main-heading">${COPY.landing.heading}</h2>
    <p class="subheading">${COPY.landing.body}</p>

    ${errorMessage ? `<div class="warning-box" role="alert" style="margin-bottom: 1.5rem;">${errorMessage}</div>` : ''}

    <form id="room-entry-form" class="room-code-form">
      <div class="form-group">
        <label for="input-room-code" class="form-label">${COPY.landing.inputLabel}</label>
        <input 
          type="text" 
          id="input-room-code" 
          class="form-input room-code-input"
          placeholder="${COPY.landing.placeholder}"
          maxlength="6"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="characters"
          required
        >
      </div>
      <div class="action-bar">
        <button type="submit" class="btn btn-primary">${COPY.landing.submitBtn}</button>
        <button type="button" id="btn-direct-create" class="btn btn-secondary">${COPY.landing.createSessionBtn}</button>
      </div>
    </form>
  `;

  const form = document.getElementById('room-entry-form');
  const codeInput = document.getElementById('input-room-code');
  const directCreateBtn = document.getElementById('btn-direct-create');

  // Direct session creation from landing page
  directCreateBtn.addEventListener('click', async () => {
    errorMessage = null;
    directCreateBtn.disabled = true;
    directCreateBtn.textContent = COPY.landing.creatingBtn;

    const code = generateRoomCode();
    const adminSecret = generateAdminSecret();

    try {
      await apiCreateRoom(code, adminSecret, 12, isDemoMode);
      activeRoomCode = code;
      activeAdminSecret = adminSecret;
      roomStatus = 'open';
      roomTotalVotes = 0;
      roomCounts = createEmptyCounts();

      window.history.pushState(null, '', buildFacilitatorUrl(code, adminSecret));

      uiState = 'facilitator-dashboard';
      announce(COPY.facilitatorDashboard.heading);
      render();
      focusCardHeading();
    } catch (err) {
      if (err.message === 'UNCONFIGURED_BACKEND') {
        uiState = 'unconfigured';
        render();
      } else {
        errorMessage = COPY.landing.errors.createFailed;
        render();
        focusCardHeading();
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawCode = codeInput.value;
    const code = normalizeRoomCode(rawCode);

    if (!isValidRoomCode(code)) {
      errorMessage = COPY.landing.errors.empty;
      render();
      focusCardHeading();
      return;
    }

    try {
      const pub = await apiGetPublicRoom(code, isDemoMode);
      activeRoomCode = pub.code;
      roomStatus = pub.status;
      roomTotalVotes = pub.total_votes;
      errorMessage = null;

      window.history.pushState(null, '', buildParticipantUrl(activeRoomCode));
      
      if (pub.counts || pub.status === 'closed') {
        if (pub.counts) roomCounts = pub.counts;
        uiState = 'receipt';
      } else {
        uiState = 'voting';
      }

      announce(`Session ${activeRoomCode} rejointe.`);
      render();
      focusCardHeading();
    } catch (err) {
      if (err.message === 'UNCONFIGURED_BACKEND') {
        uiState = 'unconfigured';
      } else if (err.message === 'EXPIRED') {
        errorMessage = COPY.landing.errors.expired;
      } else if (err.message === 'NOT_FOUND') {
        errorMessage = COPY.landing.errors.notFound;
      } else {
        errorMessage = COPY.landing.errors.network;
      }
      render();
      focusCardHeading();
    }
  });
}

/**
 * Unconfigured Backend Warning View
 */
function renderUnconfiguredView() {
  viewCardEl.innerHTML = `
    <h2 class="main-heading">Base de données non connectée</h2>
    <div class="warning-box" role="alert">
      Les identifiants Supabase réels ne sont pas configurés dans <code>src/config.js</code>.
    </div>
    <p class="subheading">
      Pour tester l'application en mode démonstration local sans Supabase, ajoutez <code>?demo=1</code> à l'URL.
    </p>
    <div class="action-bar">
      <a href="?demo=1" class="btn btn-primary">Lancer le mode démo local</a>
    </div>
  `;
}

/**
 * View 2: Participant Voting Questionnaire (Single-step submission, formal "vous")
 */
function renderVotingView() {
  viewCardEl.innerHTML = `
    <span class="step-badge">Session ${activeRoomCode}</span>
    <h2 class="main-heading">${COPY.voting.heading}</h2>
    <p class="subheading">${COPY.voting.supportingText}</p>

    ${errorMessage ? `<div class="warning-box" role="alert" style="margin-bottom: 1.5rem;">${errorMessage}</div>` : ''}

    <form id="voting-form">
      <fieldset class="options-fieldset">
        <legend class="sr-only">${COPY.voting.heading}</legend>
        <div class="options-grid">
          ${CANONICAL_OPTIONS.map(opt => `
            <div class="option-tile" data-id="${opt.id}">
              <label for="opt-${opt.id}" class="option-label ${selectedOptionId === opt.id ? 'is-selected' : ''}">
                <div class="option-header">
                  ${OPTION_SYMBOLS[opt.id]}
                  <input 
                    type="radio" 
                    name="pulse-option" 
                    id="opt-${opt.id}" 
                    value="${opt.id}" 
                    class="native-radio"
                    ${selectedOptionId === opt.id ? 'checked' : ''}
                  >
                </div>
                <span class="option-title">${opt.label}</span>
                <span class="option-desc">${opt.supportingText}</span>
              </label>
            </div>
          `).join('')}
        </div>
      </fieldset>

      <div class="action-bar">
        <button 
          type="submit" 
          id="btn-submit-vote" 
          class="btn btn-primary"
          ${selectedOptionId ? '' : 'disabled'}
        >
          ${COPY.voting.submitBtn}
        </button>
        <span class="action-microcopy">${COPY.voting.microcopy}</span>
      </div>
    </form>
  `;

  const form = document.getElementById('voting-form');
  const submitBtn = document.getElementById('btn-submit-vote');

  form.querySelectorAll('input[name="pulse-option"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedOptionId = e.target.value;
      submitBtn.disabled = false;
      form.querySelectorAll('.option-label').forEach(lbl => lbl.classList.remove('is-selected'));
      const selectedLabel = form.querySelector(`label[for="opt-${selectedOptionId}"]`);
      if (selectedLabel) selectedLabel.classList.add('is-selected');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedOptionId) return;

    errorMessage = null;
    submitBtn.disabled = true;
    submitBtn.textContent = COPY.voting.submittingBtn;
    form.querySelectorAll('input[name="pulse-option"]').forEach(r => r.disabled = true);

    try {
      const token = getOrCreateParticipantToken(activeRoomCode);
      const res = await apiSubmitVote(activeRoomCode, selectedOptionId, token, isDemoMode);
      userSubmittedOptionId = selectedOptionId;
      participantReturnedTotal = res.total !== undefined ? res.total : 1;
      uiState = 'receipt';
      announce(COPY.receipt.heading);
      render();
      focusCardHeading();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = COPY.voting.submitBtn;
      form.querySelectorAll('input[name="pulse-option"]').forEach(r => r.disabled = false);

      if (err.message === 'ALREADY_SUBMITTED') {
        errorMessage = COPY.receipt.alreadySubmitted;
        uiState = 'receipt';
      } else {
        errorMessage = COPY.landing.errors.network;
      }
      render();
      focusCardHeading();
    }
  });
}

/**
 * View 3: Participant Receipt View (Waiting or Revealed Results)
 */
function renderReceiptView() {
  const selectedOpt = CANONICAL_OPTIONS.find(o => o.id === userSubmittedOptionId);

  // If results have been revealed and valid aggregate counts exist, show final collective result
  if (roomStatus === 'closed' && hasValidCounts(roomCounts)) {
    renderParticipantRevealedView(selectedOpt);
    return;
  }

  const isClosedWithoutCounts = (roomStatus === 'closed' && !hasValidCounts(roomCounts));

  viewCardEl.innerHTML = `
    <span class="step-badge">Session ${activeRoomCode}</span>
    <h2 class="main-heading">${COPY.receipt.heading}</h2>
    <p class="subheading">${COPY.receipt.body}</p>

    ${errorMessage ? `<div class="warning-box" role="alert" style="margin-bottom: 1.5rem;">${errorMessage}</div>` : ''}

    ${selectedOpt ? `
      <div class="participant-receipt-choice-box">
        ${OPTION_SYMBOLS[selectedOpt.id]}
        <div>
          <span class="participant-receipt-choice-label">${COPY.receipt.yourChoiceLabel} ${selectedOpt.label}</span>
          <p class="participant-receipt-choice-desc">${selectedOpt.supportingText}</p>
        </div>
      </div>
    ` : ''}

    <div class="info-explanation-block" style="margin: 1.5rem 0;">
      <p class="info-explanation-body" style="font-weight: 600; color: var(--accent-strong);">
        ${isClosedWithoutCounts ? COPY.receipt.closedWithoutCountsNotice : COPY.receipt.waitingStatement}
      </p>
      <p class="info-explanation-privacy" style="margin-top: 0.5rem;">
        ${COPY.receipt.secondaryText}
      </p>
    </div>

    <div style="margin-top: 1rem;">
      <button id="btn-refresh-participant" class="btn btn-secondary">${COPY.receipt.refreshBtnParticipant}</button>
      <div id="participant-refresh-status" class="inline-status" role="status" aria-live="polite"></div>
    </div>

    <div id="receipt-offline-status" role="status" aria-live="polite"></div>
  `;

  const refreshBtn = document.getElementById('btn-refresh-participant');
  const statusEl = document.getElementById('participant-refresh-status');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = COPY.receipt.refreshBtnLoading;
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.classList.remove('is-error');
      }
      try {
        const res = await refreshParticipantRoomState();
        if (res && res.state === 'waiting') {
          refreshBtn.disabled = false;
          refreshBtn.textContent = COPY.receipt.refreshBtnParticipant;
          if (statusEl) statusEl.textContent = COPY.receipt.refreshStatusWaiting;
        } else if (res && res.state === 'closed-unavailable') {
          refreshBtn.disabled = false;
          refreshBtn.textContent = COPY.receipt.refreshBtnParticipant;
          if (statusEl) statusEl.textContent = COPY.receipt.closedWithoutCountsNotice;
        }
      } catch (_) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = COPY.receipt.refreshBtnParticipant;
        if (statusEl) {
          statusEl.textContent = COPY.receipt.offlineNotice;
          statusEl.classList.add('is-error');
        }
      }
    });
  }
}

/**
 * Render Revealed Collective Results for Participant
 */
function renderParticipantRevealedView(selectedOpt) {
  const { total } = generatePulseProfileData(roomCounts);

  viewCardEl.innerHTML = `
    <span class="step-badge">Session ${activeRoomCode}</span>
    <h2 class="main-heading">${COPY.results.heading}</h2>
    <p class="subheading" style="font-weight: 700; color: var(--accent-strong);">${COPY.results.formatTotal(total)}</p>

    ${selectedOpt ? `
      <div class="participant-receipt-choice-box" style="margin-bottom: 1.5rem;">
        ${OPTION_SYMBOLS[selectedOpt.id]}
        <div>
          <span class="participant-receipt-choice-label">${COPY.receipt.yourChoiceLabel} ${selectedOpt.label}</span>
          <p class="participant-receipt-choice-desc">${selectedOpt.supportingText}</p>
        </div>
      </div>
    ` : ''}

    ${renderCollectiveResultVisualization(roomCounts)}

    <p class="results-disclaimer">${COPY.results.disclaimer}</p>
  `;
}

/**
 * View 4: Facilitator Session Page ("Session prête", 2-Step Layout, One-Click Close & Reveal)
 */
function renderFacilitatorDashboardView() {
  const shareLink = buildParticipantUrl(activeRoomCode);
  const countText = formatRoomResponseCount(roomTotalVotes);

  viewCardEl.innerHTML = `
    <h2 class="main-heading">${COPY.facilitatorDashboard.heading}</h2>
    <p class="subheading">${COPY.facilitatorDashboard.instruction}</p>

    <!-- STEP 1: Partagez le lien -->
    <div class="info-explanation-block" style="margin-bottom: 2rem;">
      <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--ink); margin-bottom: 1rem;">
        ${COPY.facilitatorDashboard.step1Title}
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
        <div style="background: var(--surface-raised); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--line);">
          <span class="presentation-section-title">${COPY.facilitatorDashboard.codeLabel}</span>
          <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.12em; color: var(--accent-strong); margin: 0.25rem 0 0.5rem 0;">
            ${activeRoomCode}
          </div>
          <button id="btn-copy-code" class="btn btn-secondary btn-sm">${COPY.facilitatorDashboard.copyCodeBtn}</button>
        </div>

        <div style="background: var(--surface-raised); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--line);">
          <span class="presentation-section-title">${COPY.facilitatorDashboard.linkLabel}</span>
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--ink-soft); word-break: break-all; margin: 0.25rem 0 0.5rem 0;">
            ${shareLink}
          </div>
          <button id="btn-copy-link" class="btn btn-secondary btn-sm">${COPY.facilitatorDashboard.copyLinkBtn}</button>
        </div>
      </div>
      <div id="facilitator-copy-status" class="inline-status" role="status" aria-live="polite"></div>
    </div>

    <!-- STEP 2: Affichez les résultats -->
    <div class="info-explanation-block">
      <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--ink); margin-bottom: 1rem;">
        ${COPY.facilitatorDashboard.step2Title}
      </h3>
      
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div id="facilitator-live-count" style="font-size: 1.5rem; font-weight: 800; color: var(--ink);">
          ${roomTotalVotes > 0 ? countText : COPY.facilitatorDashboard.emptyState}
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button 
            id="btn-reveal-results" 
            class="btn btn-primary"
            ${roomTotalVotes > 0 ? '' : 'disabled'}
          >
            ${COPY.facilitatorDashboard.revealBtn}
          </button>
          <button id="btn-refresh-room" class="btn btn-secondary">
            ${COPY.facilitatorDashboard.refreshBtn}
          </button>
        </div>
      </div>
      <div id="facilitator-refresh-status" class="inline-status" role="status" aria-live="polite"></div>
    </div>

    ${isSmallGroupConfirmOpen ? `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-card">
          <h3 id="modal-title" style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: var(--ink);">
            ${COPY.facilitatorDashboard.smallGroupConfirm.question}
          </h3>
          <div class="action-bar" style="margin-top: 1.5rem;">
            <button id="btn-confirm-small-group-reveal" class="btn btn-primary">
              ${COPY.facilitatorDashboard.smallGroupConfirm.confirmBtn}
            </button>
            <button id="btn-cancel-small-group-reveal" class="btn btn-secondary">
              ${COPY.facilitatorDashboard.smallGroupConfirm.cancelBtn}
            </button>
          </div>
        </div>
      </div>
    ` : ''}
  `;

  document.getElementById('btn-copy-code').addEventListener('click', (e) => {
    copyWithFeedback(e.currentTarget, activeRoomCode, COPY.facilitatorDashboard.codeCopied);
  });

  document.getElementById('btn-copy-link').addEventListener('click', (e) => {
    copyWithFeedback(e.currentTarget, shareLink, COPY.facilitatorDashboard.linkCopied);
  });

  const refreshBtn = document.getElementById('btn-refresh-room');
  const refreshStatusEl = document.getElementById('facilitator-refresh-status');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = COPY.facilitatorDashboard.refreshBtnLoading;
      if (refreshStatusEl) {
        refreshStatusEl.textContent = '';
        refreshStatusEl.classList.remove('is-error');
      }
      try {
        const state = await apiGetFacilitatorState(activeRoomCode, activeAdminSecret, isDemoMode);
        roomTotalVotes = state.total;
        roomStatus = state.status;
        if (state.counts) roomCounts = state.counts;
        renderDashboardStats();
        if (refreshStatusEl) {
          refreshStatusEl.textContent = COPY.facilitatorDashboard.refreshStatusUpdated;
        }
      } catch (_) {
        if (refreshStatusEl) {
          refreshStatusEl.textContent = COPY.facilitatorDashboard.refreshStatusFailed;
          refreshStatusEl.classList.add('is-error');
        }
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = COPY.facilitatorDashboard.refreshBtn;
      }
    });
  }

  const revealBtn = document.getElementById('btn-reveal-results');

  const executeReveal = async () => {
    revealBtn.disabled = true;
    revealBtn.textContent = COPY.facilitatorDashboard.revealingBtn;
    try {
      await apiCloseRoom(activeRoomCode, activeAdminSecret, isDemoMode);
      const state = await apiGetFacilitatorState(activeRoomCode, activeAdminSecret, isDemoMode);
      roomStatus = 'closed';
      roomTotalVotes = state.total;
      if (state.counts) roomCounts = state.counts;
      stopAllPolling();
      uiState = 'facilitator-revealed';
      announce(COPY.results.heading);
      render();
      focusCardHeading();
    } catch (_) {
      revealBtn.disabled = false;
      revealBtn.textContent = COPY.facilitatorDashboard.revealBtn;
    }
  };

  revealBtn.addEventListener('click', () => {
    if (roomTotalVotes > 0 && roomTotalVotes < 3) {
      isSmallGroupConfirmOpen = true;
      render();
      return;
    }
    executeReveal();
  });

  if (isSmallGroupConfirmOpen) {
    document.getElementById('btn-confirm-small-group-reveal')?.addEventListener('click', () => {
      isSmallGroupConfirmOpen = false;
      executeReveal();
    });
    document.getElementById('btn-cancel-small-group-reveal')?.addEventListener('click', () => {
      isSmallGroupConfirmOpen = false;
      render();
    });
  }
}

/**
 * View 5: Facilitator Revealed Results View (Horizontal 100% Stacked Bar Chart)
 */
function renderFacilitatorRevealedView() {
  const { total } = generatePulseProfileData(roomCounts);

  viewCardEl.innerHTML = `
    <h2 class="main-heading">${COPY.results.heading}</h2>
    <p class="subheading" style="font-weight: 700; color: var(--accent-strong);">${COPY.results.formatTotal(total)}</p>

    ${renderCollectiveResultVisualization(roomCounts)}

    <p class="results-disclaimer">${COPY.results.disclaimer}</p>

    <div class="action-bar" style="margin-top: 2rem;">
      <button id="btn-create-new-session" class="btn btn-primary">${COPY.results.newSessionBtn}</button>
      <button id="btn-refresh-results" class="btn btn-secondary">${COPY.results.refreshBtn}</button>
      <button id="btn-delete-session-init" class="btn btn-secondary u-color-danger">${COPY.results.deleteBtn}</button>
    </div>
    <div id="result-refresh-status" class="inline-status" role="status" aria-live="polite"></div>
  `;

  const refreshResultsBtn = document.getElementById('btn-refresh-results');
  const resultStatusEl = document.getElementById('result-refresh-status');
  if (refreshResultsBtn) {
    refreshResultsBtn.addEventListener('click', async () => {
      refreshResultsBtn.disabled = true;
      refreshResultsBtn.textContent = COPY.results.refreshBtnLoading;
      if (resultStatusEl) {
        resultStatusEl.textContent = '';
        resultStatusEl.classList.remove('is-error');
      }
      try {
        const state = await apiGetFacilitatorState(activeRoomCode, activeAdminSecret, isDemoMode);
        if (hasValidCounts(state.counts)) {
          roomCounts = state.counts;
          roomTotalVotes = state.total;
        }
        render();
        const newStatusEl = document.getElementById('result-refresh-status');
        if (newStatusEl) {
          newStatusEl.textContent = COPY.results.refreshStatusUpdated;
        }
      } catch (_) {
        refreshResultsBtn.disabled = false;
        refreshResultsBtn.textContent = COPY.results.refreshBtn;
        if (resultStatusEl) {
          resultStatusEl.textContent = COPY.results.refreshStatusFailed;
          resultStatusEl.classList.add('is-error');
        }
      }
    });
  }

  // Primary Action: Create a new session directly
  document.getElementById('btn-create-new-session').addEventListener('click', async () => {
    stopAllPolling();
    activeRoomCode = null;
    activeAdminSecret = null;
    selectedOptionId = null;
    userSubmittedOptionId = null;
    roomTotalVotes = 0;
    roomCounts = createEmptyCounts();

    const code = generateRoomCode();
    const adminSecret = generateAdminSecret();

    try {
      await apiCreateRoom(code, adminSecret, 12, isDemoMode);
      activeRoomCode = code;
      activeAdminSecret = adminSecret;
      roomStatus = 'open';

      window.history.pushState(null, '', buildFacilitatorUrl(code, adminSecret));
      uiState = 'facilitator-dashboard';
      announce(COPY.facilitatorDashboard.heading);
      render();
      focusCardHeading();
    } catch (_) {
      window.history.pushState(null, '', window.location.pathname);
      uiState = 'landing';
      render();
      focusCardHeading();
    }
  });

  document.getElementById('btn-delete-session-init').addEventListener('click', () => {
    uiState = 'facilitator-delete-confirm';
    render();
    focusCardHeading();
  });
}

/**
 * View 6: Facilitator Deletion Confirmation View
 */
function renderFacilitatorDeleteConfirmView() {
  viewCardEl.innerHTML = `
    <h2 class="main-heading">${COPY.deletionConfirmation.heading}</h2>
    <p class="subheading">${COPY.deletionConfirmation.body}</p>

    <div class="warning-box" role="alert" style="margin-bottom: 2rem;">
      Toutes les données de cette session seront définitivement effacées du serveur.
    </div>

    <div class="action-bar">
      <button id="btn-confirm-delete" class="btn btn-danger">${COPY.deletionConfirmation.confirmBtn}</button>
      <button id="btn-cancel-delete" class="btn btn-secondary">${COPY.deletionConfirmation.cancelBtn}</button>
    </div>
  `;

  document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    uiState = 'facilitator-revealed';
    render();
    focusCardHeading();
  });

  document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
    try {
      await apiDeleteRoom(activeRoomCode, activeAdminSecret, isDemoMode);
    } catch (_) {}

    stopAllPolling();
    activeRoomCode = null;
    activeAdminSecret = null;
    selectedOptionId = null;
    userSubmittedOptionId = null;

    window.history.pushState(null, '', window.location.pathname);
    uiState = 'landing';
    announce('Session supprimée.');
    render();
    focusCardHeading();
  });
}

/**
 * Main Central Render Router
 */
function render() {
  stopAllPolling();

  switch (uiState) {
    case 'landing':
      renderLandingView();
      break;
    case 'unconfigured':
      renderUnconfiguredView();
      break;
    case 'voting':
      renderVotingView();
      break;
    case 'receipt':
      renderReceiptView();
      startReceiptPolling();
      break;
    case 'facilitator-dashboard':
      renderFacilitatorDashboardView();
      startPolling();
      break;
    case 'facilitator-revealed':
      renderFacilitatorRevealedView();
      break;
    case 'facilitator-delete-confirm':
      renderFacilitatorDeleteConfirmView();
      break;
    default:
      renderLandingView();
  }
}

// Pause polling when browser tab is hidden and resume when visible
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAllPolling();
  } else {
    if (uiState === 'facilitator-dashboard') startPolling();
    if (uiState === 'receipt') startReceiptPolling();
  }
});

// App Startup Execution
initApp();
