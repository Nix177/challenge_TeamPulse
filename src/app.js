import { CANONICAL_OPTIONS } from './options.js';
import {
  createEmptyCounts,
  getTotalVotes,
  getPercentages,
  createDemoCounts
} from './model.js';
import { calculateInsight } from './insight.js';
import {
  COPY,
  formatRoomResponseCount
} from './copy.js';
import {
  generatePulseDataVisualization,
  renderParticipationPulseSvg
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

// UI States: 'landing' | 'unconfigured' | 'voting' | 'confirming' | 'receipt' | 'facilitator-create' | 'facilitator-dashboard' | 'facilitator-closed' | 'facilitator-revealed' | 'facilitator-delete-confirm'
let uiState = 'landing';
let errorMessage = null;
let pollTimerId = null;
let receiptPollTimerId = null;

/* URL Mode Flags */
const searchParams = new URLSearchParams(window.location.search);
const isDemoMode = searchParams.get('demo') === '1';

/* DOM Elements */
const viewCardEl = document.getElementById('view-card');
const headerFacilitatorContainerEl = document.getElementById('header-facilitator-container');
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
      renderHeaderButton();
      renderDashboardStats();
    } catch (_) {}
  }, 5000);
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
      const pub = await apiGetPublicRoom(activeRoomCode, isDemoMode);
      participantReturnedTotal = pub.total_votes;

      const svgContainer = document.getElementById('receipt-live-pulse-container');
      const countEl = document.getElementById('receipt-live-count');
      const offlineStatusEl = document.getElementById('receipt-offline-status');
      const closedNoticeEl = document.getElementById('receipt-closed-notice');

      if (svgContainer) {
        svgContainer.innerHTML = renderParticipationPulseSvg(pub.total_votes);
      }
      if (countEl) {
        countEl.textContent = formatRoomResponseCount(pub.total_votes);
      }
      if (offlineStatusEl) {
        offlineStatusEl.textContent = '';
      }

      if (pub.status === 'closed') {
        stopReceiptPolling();
        if (closedNoticeEl) {
          closedNoticeEl.innerHTML = `<div class="warning-box" role="alert" style="margin-top: 1.25rem;">${COPY.receipt.closedNotice}</div>`;
        }
      }
    } catch (err) {
      if (err.message === 'CLOSED' || err.message === 'EXPIRED' || err.message === 'NOT_FOUND') {
        stopReceiptPolling();
        const closedNoticeEl = document.getElementById('receipt-closed-notice');
        if (closedNoticeEl) {
          closedNoticeEl.innerHTML = `<div class="warning-box" role="alert" style="margin-top: 1.25rem;">${COPY.receipt.closedNotice}</div>`;
        }
      } else {
        const offlineStatusEl = document.getElementById('receipt-offline-status');
        if (offlineStatusEl) {
          offlineStatusEl.innerHTML = `<p class="action-microcopy" style="margin-top: 0.5rem;">${COPY.receipt.offlineNotice}</p>`;
        }
      }
    }
  }, 5000);
}

/**
 * Updates dynamic dashboard response count and neutral pulse visual without full re-render.
 */
function renderDashboardStats() {
  const countEl = document.getElementById('dash-count-display');
  const livePulseEl = document.getElementById('facilitator-live-pulse');
  const liveCountEl = document.getElementById('facilitator-live-count');

  if (countEl) {
    countEl.textContent = formatRoomResponseCount(roomTotalVotes);
  }
  if (livePulseEl) {
    livePulseEl.innerHTML = renderParticipationPulseSvg(roomTotalVotes);
  }
  if (liveCountEl) {
    const text = roomTotalVotes > 0 ? formatRoomResponseCount(roomTotalVotes) : COPY.facilitatorDashboard.emptyState;
    if (liveCountEl.textContent !== text) {
      liveCountEl.textContent = text;
      announce(text);
    }
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
      uiState = state.status === 'closed' ? 'facilitator-closed' : 'facilitator-dashboard';
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
      uiState = 'voting';
    } catch (err) {
      if (err.message === 'UNCONFIGURED_BACKEND') {
        uiState = 'unconfigured';
      } else if (err.message === 'CLOSED') {
        errorMessage = COPY.landing.errors.closed;
        uiState = 'landing';
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
 * Header Action Button Handler (Facilitator vs Participant view toggling)
 */
function renderHeaderButton() {
  if (!headerFacilitatorContainerEl) return;

  if (uiState === 'facilitator-dashboard' || uiState === 'facilitator-closed' || uiState === 'facilitator-revealed') {
    headerFacilitatorContainerEl.innerHTML = `
      <button id="btn-header-action" class="btn btn-secondary btn-sm">
        ${COPY.brand.joinAction}
      </button>
    `;
    document.getElementById('btn-header-action').addEventListener('click', () => {
      stopAllPolling();
      activeRoomCode = null;
      activeAdminSecret = null;
      selectedOptionId = null;
      userSubmittedOptionId = null;
      window.history.pushState(null, '', window.location.pathname);
      uiState = 'landing';
      render();
      focusCardHeading();
    });
  } else {
    headerFacilitatorContainerEl.innerHTML = `
      <button id="btn-header-action" class="btn btn-secondary btn-sm">
        ${COPY.brand.facilitatorAction}
      </button>
    `;
    document.getElementById('btn-header-action').addEventListener('click', () => {
      stopAllPolling();
      uiState = 'facilitator-create';
      render();
      focusCardHeading();
    });
  }
}

/**
 * View 1: Room Selection / Landing Screen
 */
function renderLandingView() {
  viewCardEl.innerHTML = `
    <span class="step-badge">Connexion</span>
    <h2 class="main-heading">${COPY.landing.heading}</h2>
    <p class="subheading">${COPY.landing.body}</p>

    ${errorMessage ? `<div class="warning-box" role="alert">${errorMessage}</div>` : ''}

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
        <button type="button" id="btn-goto-create" class="btn btn-secondary">${COPY.landing.createSessionBtn}</button>
      </div>
    </form>
  `;

  const form = document.getElementById('room-entry-form');
  const codeInput = document.getElementById('input-room-code');
  const gotoCreateBtn = document.getElementById('btn-goto-create');

  gotoCreateBtn.addEventListener('click', () => {
    errorMessage = null;
    uiState = 'facilitator-create';
    render();
    focusCardHeading();
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
      errorMessage = null;

      window.history.pushState(null, '', buildParticipantUrl(activeRoomCode));
      uiState = 'voting';
      announce(`Session ${activeRoomCode} rejointe.`);
      render();
      focusCardHeading();
    } catch (err) {
      if (err.message === 'UNCONFIGURED_BACKEND') {
        uiState = 'unconfigured';
      } else if (err.message === 'CLOSED') {
        errorMessage = COPY.landing.errors.closed;
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
    <span class="step-badge">Configuration</span>
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
 * View 2: Participant Voting Questionnaire
 */
function renderVotingView() {
  viewCardEl.innerHTML = `
    <span class="step-badge">Session ${activeRoomCode}</span>
    <h2 class="main-heading">${COPY.voting.heading}</h2>
    <p class="subheading">${COPY.voting.supportingText}</p>

    <form id="voting-form">
      <fieldset class="options-fieldset">
        <legend class="sr-only">${COPY.voting.heading}</legend>
        <div class="options-grid">
          ${CANONICAL_OPTIONS.map(opt => `
            <div class="option-card-wrapper">
              <input 
                type="radio" 
                name="pulse-option" 
                id="opt-${opt.id}" 
                value="${opt.id}" 
                class="sr-only option-radio-input"
                ${selectedOptionId === opt.id ? 'checked' : ''}
              >
              <label for="opt-${opt.id}" class="option-card" style="--opt-accent: ${opt.colorVar};">
                <span class="option-radio-visual" aria-hidden="true"></span>
                ${OPTION_SYMBOLS[opt.id]}
                <span class="option-title">${opt.label}</span>
                <span class="option-desc option-desc-inline">${opt.supportingText}</span>
              </label>
            </div>
          `).join('')}
        </div>
      </fieldset>

      <div id="tablet-desc-region" class="tablet-desc-box" aria-live="polite">
        <p class="${selectedOptionId ? '' : 'tablet-desc-placeholder'}">
          ${selectedOptionId 
            ? CANONICAL_OPTIONS.find(o => o.id === selectedOptionId)?.supportingText 
            : COPY.voting.tabletDefaultDesc}
        </p>
      </div>

      <div class="action-bar">
        <button 
          type="submit" 
          id="btn-continue" 
          class="btn btn-primary"
          ${selectedOptionId ? '' : 'disabled'}
        >
          ${COPY.voting.continueBtn}
        </button>
        <span class="action-microcopy">${COPY.voting.microcopy}</span>
      </div>
    </form>
  `;

  const form = document.getElementById('voting-form');
  const continueBtn = document.getElementById('btn-continue');
  const tabletDescText = document.getElementById('tablet-desc-region')?.querySelector('p');

  form.querySelectorAll('input[name="pulse-option"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedOptionId = e.target.value;
      continueBtn.disabled = false;
      const opt = CANONICAL_OPTIONS.find(o => o.id === selectedOptionId);
      if (tabletDescText && opt) {
        tabletDescText.textContent = opt.supportingText;
        tabletDescText.classList.remove('tablet-desc-placeholder');
      }
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedOptionId) return;
    uiState = 'confirming';
    announce('Étape de vérification.');
    render();
    focusCardHeading();
  });
}

/**
 * View 3: Participant Confirmation Screen
 */
function renderConfirmingView() {
  const selectedOpt = CANONICAL_OPTIONS.find(o => o.id === selectedOptionId);
  if (!selectedOpt) {
    uiState = 'voting';
    render();
    return;
  }

  viewCardEl.innerHTML = `
    <span class="step-badge">Session ${activeRoomCode}</span>
    <h2 class="main-heading">${COPY.confirmation.heading}</h2>
    <p class="subheading">${COPY.confirmation.formatSupportingText(activeRoomCode)}</p>

    <div class="confirmation-summary-card" style="--summary-accent: ${selectedOpt.colorVar};">
      ${OPTION_SYMBOLS[selectedOpt.id]}
      <div>
        <h3 class="option-title confirmation-title">${selectedOpt.label}</h3>
        <p class="option-desc confirmation-desc">${selectedOpt.supportingText}</p>
      </div>
    </div>

    <div class="info-explanation-block">
      <h4 class="info-explanation-title">${COPY.confirmation.infoBlockHeading}</h4>
      <p class="info-explanation-body">${COPY.confirmation.infoBlockBody}</p>
      <p class="info-explanation-privacy">${COPY.confirmation.networkExplanation}</p>
    </div>

    <div class="action-bar">
      <button id="btn-confirm-vote" class="btn btn-primary">${COPY.confirmation.confirmBtn}</button>
      <button id="btn-modify-choice" class="btn btn-secondary">${COPY.confirmation.modifyBtn}</button>
    </div>
  `;

  document.getElementById('btn-modify-choice').addEventListener('click', () => {
    uiState = 'voting';
    announce('Retour au choix.');
    render();
    focusCardHeading();
  });

  document.getElementById('btn-confirm-vote').addEventListener('click', async () => {
    try {
      userSubmittedOptionId = selectedOptionId;
      const token = getOrCreateParticipantToken(activeRoomCode);
      const res = await apiSubmitVote(activeRoomCode, selectedOptionId, token, isDemoMode);
      participantReturnedTotal = res.total !== undefined ? res.total : 1;
      uiState = 'receipt';
      announce(COPY.receipt.heading);
      render();
      focusCardHeading();
    } catch (err) {
      if (err.message === 'ALREADY_SUBMITTED') {
        errorMessage = COPY.receipt.alreadySubmitted;
      } else {
        errorMessage = COPY.landing.errors.network;
      }
      uiState = 'receipt';
      render();
      focusCardHeading();
    }
  });
}

/**
 * View 4: Participant Submission Receipt Screen (Live Participation Visual)
 */
function renderReceiptView() {
  if (errorMessage) {
    viewCardEl.innerHTML = `
      <span class="step-badge">Session ${activeRoomCode}</span>
      <h2 class="main-heading">${COPY.receipt.heading}</h2>
      <div class="warning-box" role="alert" style="margin-bottom: 2rem;">
        ${errorMessage}
      </div>
      <p class="receipt-explanation-text">${COPY.receipt.privacyExplanation}</p>
      <p style="margin-top: 1.5rem; font-weight: 600;">${COPY.receipt.closingInstruction}</p>
    `;
    return;
  }

  const selectedOpt = CANONICAL_OPTIONS.find(o => o.id === selectedOptionId || o.id === userSubmittedOptionId);
  const liveTotal = participantReturnedTotal || roomTotalVotes || 1;

  viewCardEl.innerHTML = `
    <span class="step-badge">Session ${activeRoomCode}</span>
    <h2 class="main-heading">${COPY.receipt.heading}</h2>
    <p class="receipt-primary-body">${COPY.receipt.formatBody(activeRoomCode)}</p>

    ${selectedOpt ? `
      <div class="participant-receipt-choice-box">
        ${OPTION_SYMBOLS[selectedOpt.id]}
        <div>
          <span class="participant-receipt-choice-label">${COPY.receipt.yourChoiceLabel} ${selectedOpt.label}</span>
          <p class="participant-receipt-choice-desc">${selectedOpt.supportingText}</p>
        </div>
      </div>
    ` : ''}

    <div class="participation-pulse-container">
      <div id="receipt-live-pulse-container" style="width: 100%;">
        ${renderParticipationPulseSvg(liveTotal)}
      </div>
      <div id="receipt-live-count" class="live-pulse-badge-count">
        ${formatRoomResponseCount(liveTotal)}
      </div>
      <p class="live-pulse-subtext">${COPY.receipt.waitingStatement}</p>
    </div>

    <div id="receipt-offline-status" role="status" aria-live="polite"></div>
    <div id="receipt-closed-notice"></div>

    <div class="receipt-card">
      <p class="receipt-explanation-text">${COPY.receipt.privacyExplanation}</p>
      
      <div class="receipt-handoff-banner" style="margin-top: 1rem;">
        <svg class="handoff-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>${COPY.receipt.closingInstruction}</span>
      </div>
    </div>
  `;
}

/**
 * View 5: Facilitator Creation Screen
 */
function renderFacilitatorCreateView() {
  viewCardEl.innerHTML = `
    <span class="step-badge">Facilitation</span>
    <h2 class="main-heading">${COPY.creation.heading}</h2>
    <p class="subheading">${COPY.creation.body}</p>

    ${errorMessage ? `<div class="warning-box" role="alert" style="margin-bottom: 1.5rem;">${errorMessage}</div>` : ''}

    <div class="info-explanation-block">
      <p class="info-explanation-body">${COPY.creation.durationStatement}</p>
    </div>

    <div class="action-bar">
      <button id="btn-create-session-submit" class="btn btn-primary">${COPY.creation.createBtn}</button>
    </div>
  `;

  const submitBtn = document.getElementById('btn-create-session-submit');

  submitBtn.addEventListener('click', async () => {
    errorMessage = null;
    submitBtn.disabled = true;
    submitBtn.textContent = COPY.creation.loadingBtn;

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
      announce(COPY.facilitatorDashboard.openHeading);
      render();
      focusCardHeading();
    } catch (err) {
      if (err.message === 'UNCONFIGURED_BACKEND') {
        uiState = 'unconfigured';
        render();
      } else {
        errorMessage = COPY.creation.errorMessage;
        uiState = 'facilitator-create';
        render();
        focusCardHeading();
      }
    }
  });
}

/**
 * View 6: Facilitator Active Dashboard (Neutral Live Pulse Visual)
 */
function renderFacilitatorDashboardView() {
  const shareLink = buildParticipantUrl(activeRoomCode);
  const countText = formatRoomResponseCount(roomTotalVotes);

  viewCardEl.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
      <div>
        <span class="step-badge">${COPY.facilitatorDashboard.statusOpen}</span>
        <h2 class="main-heading" style="margin-bottom: 0.25rem;">${COPY.facilitatorDashboard.openHeading}</h2>
        <p class="subheading" style="margin-bottom: 0;">${COPY.facilitatorDashboard.openInstruction}</p>
      </div>
      <div class="session-status-badge">
        <span id="dash-count-display">${countText}</span>
      </div>
    </div>

    <div class="participation-pulse-container" style="margin-bottom: 2rem;">
      <div id="facilitator-live-pulse" style="width: 100%;">
        ${renderParticipationPulseSvg(roomTotalVotes)}
      </div>
      <div id="facilitator-live-count" class="live-pulse-badge-count">
        ${roomTotalVotes > 0 ? countText : COPY.facilitatorDashboard.emptyState}
      </div>
      <p class="live-pulse-subtext">${COPY.facilitatorDashboard.privacyNote}</p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
      <div class="receipt-card" style="margin-bottom: 0;">
        <span class="presentation-section-title">${COPY.facilitatorDashboard.codeLabel}</span>
        <div style="font-size: 2.5rem; font-weight: 800; letter-spacing: 0.15em; color: var(--accent-strong);">
          ${activeRoomCode}
        </div>
        <button id="btn-copy-code" class="btn btn-secondary btn-sm">${COPY.facilitatorDashboard.copyCodeBtn}</button>
      </div>

      <div class="receipt-card" style="margin-bottom: 0;">
        <span class="presentation-section-title">${COPY.facilitatorDashboard.linkLabel}</span>
        <div style="font-size: 0.9rem; font-weight: 600; color: var(--ink-soft); word-break: break-all; margin: 0.5rem 0;">
          ${shareLink}
        </div>
        <button id="btn-copy-link" class="btn btn-secondary btn-sm">${COPY.facilitatorDashboard.copyLinkBtn}</button>
      </div>
    </div>

    <div class="action-bar">
      <button id="btn-close-room" class="btn btn-primary">${COPY.facilitatorDashboard.closeBtn}</button>
      <button id="btn-refresh-room" class="btn btn-secondary">${COPY.facilitatorDashboard.refreshBtn}</button>
    </div>
  `;

  document.getElementById('btn-copy-code').addEventListener('click', () => {
    navigator.clipboard.writeText(activeRoomCode);
    announce(COPY.facilitatorDashboard.codeCopied);
  });

  document.getElementById('btn-copy-link').addEventListener('click', () => {
    navigator.clipboard.writeText(shareLink);
    announce(COPY.facilitatorDashboard.linkCopied);
  });

  document.getElementById('btn-refresh-room').addEventListener('click', async () => {
    try {
      const state = await apiGetFacilitatorState(activeRoomCode, activeAdminSecret, isDemoMode);
      roomTotalVotes = state.total;
      roomStatus = state.status;
      if (state.counts) roomCounts = state.counts;
      renderDashboardStats();
      announce(formatRoomResponseCount(roomTotalVotes));
    } catch (_) {}
  });

  document.getElementById('btn-close-room').addEventListener('click', async () => {
    try {
      await apiCloseRoom(activeRoomCode, activeAdminSecret, isDemoMode);
      roomStatus = 'closed';
      stopAllPolling();
      uiState = 'facilitator-closed';
      announce(COPY.facilitatorDashboard.closedHeading);
      render();
      focusCardHeading();
    } catch (_) {}
  });
}

/**
 * View 7: Facilitator Closed Room State (Pre-reveal)
 */
function renderFacilitatorClosedView() {
  const countText = formatRoomResponseCount(roomTotalVotes);

  viewCardEl.innerHTML = `
    <span class="step-badge">Session ${activeRoomCode}</span>
    <h2 class="main-heading">${COPY.facilitatorDashboard.closedHeading}</h2>
    <p class="subheading">${COPY.facilitatorDashboard.closedBody}</p>

    <div class="participation-pulse-container" style="margin-bottom: 2rem;">
      <div id="facilitator-live-pulse" style="width: 100%;">
        ${renderParticipationPulseSvg(roomTotalVotes)}
      </div>
      <div class="live-pulse-badge-count">
        ${countText}
      </div>
    </div>

    <div class="action-bar">
      <button id="btn-reveal-results" class="btn btn-primary">${COPY.facilitatorDashboard.revealBtn}</button>
      <button id="btn-delete-session-init" class="btn btn-secondary u-color-danger">${COPY.facilitatorDashboard.deleteBtn}</button>
    </div>
  `;

  document.getElementById('btn-reveal-results').addEventListener('click', () => {
    uiState = 'facilitator-revealed';
    announce(COPY.facilitatorRevealed.heading);
    render();
    focusCardHeading();
  });

  document.getElementById('btn-delete-session-init').addEventListener('click', () => {
    uiState = 'facilitator-delete-confirm';
    render();
    focusCardHeading();
  });
}

/**
 * View 8: Facilitator Revealed Results View (Categorical Wave Visualisation)
 */
function renderFacilitatorRevealedView() {
  const percentages = getPercentages(roomCounts);
  const { pathD } = generatePulseDataVisualization(percentages);
  const insight = calculateInsight(roomCounts);
  const totalText = formatRoomResponseCount(roomTotalVotes);

  viewCardEl.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
      <div>
        <span class="step-badge">Session ${activeRoomCode}</span>
        <h2 class="main-heading" style="margin-bottom: 0.25rem;">${COPY.facilitatorRevealed.heading}</h2>
        <p class="subheading" style="margin-bottom: 0;">${totalText}</p>
      </div>
      <button id="btn-delete-session-top" class="btn btn-secondary btn-sm u-color-danger">
        ${COPY.facilitatorRevealed.deleteBtn}
      </button>
    </div>

    <div class="visualisation-card">
      <h3 class="visualisation-title">${COPY.facilitatorRevealed.distributionTitle}</h3>
      <div class="visualisation-svg-container">
        <svg class="visualisation-svg" viewBox="0 0 500 120" aria-hidden="true">
          <path d="${pathD}" class="pulse-wave-path" />
        </svg>
      </div>

      <div class="results-bars-list">
        ${CANONICAL_OPTIONS.map(opt => {
          const count = roomCounts[opt.id] || 0;
          const pct = percentages[opt.id] || 0;
          return `
            <div class="result-bar-row">
              <div class="result-bar-header">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  ${OPTION_SYMBOLS[opt.id]}
                  <span class="result-bar-label">${opt.label}</span>
                </div>
                <div class="result-bar-metrics">
                  <span class="result-bar-count">${count}</span>
                  <span class="result-bar-pct">${pct}%</span>
                </div>
              </div>
              <div class="result-bar-track">
                <div class="result-bar-fill" style="width: ${pct}%; --bar-accent: ${opt.colorVar};"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    ${insight.observation ? `
      <div class="observation-card">
        <h3 class="observation-heading">${COPY.facilitatorRevealed.observationHeading}</h3>
        <p class="observation-text">${insight.observation}</p>
      </div>
    ` : ''}

    <div class="conversation-prompt-card">
      <h3 class="conversation-prompt-heading">${COPY.facilitatorRevealed.conversationHeading}</h3>
      <p class="conversation-prompt-text">${insight.prompt}</p>
      <p class="conversation-instruction">${COPY.facilitatorRevealed.conversationInstruction}</p>
    </div>

    <p class="results-disclaimer">${COPY.facilitatorRevealed.disclaimer}</p>
  `;

  document.getElementById('btn-delete-session-top').addEventListener('click', () => {
    uiState = 'facilitator-delete-confirm';
    render();
    focusCardHeading();
  });
}

/**
 * View 9: Facilitator Permanent Session Deletion Confirmation Screen
 */
function renderFacilitatorDeleteConfirmView() {
  viewCardEl.innerHTML = `
    <span class="step-badge">Session ${activeRoomCode}</span>
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
    uiState = roomStatus === 'closed' ? 'facilitator-closed' : 'facilitator-dashboard';
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
  renderHeaderButton();

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
    case 'confirming':
      renderConfirmingView();
      break;
    case 'receipt':
      renderReceiptView();
      startReceiptPolling();
      break;
    case 'facilitator-create':
      renderFacilitatorCreateView();
      break;
    case 'facilitator-dashboard':
      renderFacilitatorDashboardView();
      startPolling();
      break;
    case 'facilitator-closed':
      renderFacilitatorClosedView();
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
