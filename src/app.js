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
import { generatePulseDataVisualization } from './visualisation.js';
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

// UI States: 'landing' | 'unconfigured' | 'voting' | 'confirming' | 'receipt' | 'facilitator-create' | 'facilitator-dashboard' | 'facilitator-closed' | 'facilitator-revealed' | 'facilitator-delete-confirm'
let uiState = 'landing';
let errorMessage = null;
let pollTimerId = null;

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
 * Starts dashboard polling timer (~5s interval).
 */
function startPolling() {
  stopPolling();
  if (isDemoMode) return;

  pollTimerId = setInterval(async () => {
    if (document.hidden || !activeRoomCode || !activeAdminSecret) return;
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
 * Updates dynamic dashboard response count display without full re-render.
 */
function renderDashboardStats() {
  const countEl = document.getElementById('dash-count-display');
  if (countEl) {
    countEl.textContent = formatRoomResponseCount(roomTotalVotes);
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
      if (state.status === 'open') startPolling();
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
      } else {
        errorMessage = err.message === 'CLOSED' ? COPY.landing.errors.closed :
                       err.message === 'EXPIRED' ? COPY.landing.errors.expired :
                       COPY.landing.errors.notFound;
        uiState = 'landing';
      }
    }
  }

  render();
}

/**
 * Header Facilitator / Join Button
 */
function renderHeaderButton() {
  const isFacilitatorView = uiState.startsWith('facilitator-');

  if (isFacilitatorView) {
    headerFacilitatorContainerEl.innerHTML = `
      <button id="btn-header-nav" class="btn btn-secondary btn-sm">
        ${COPY.brand.joinAction}
      </button>
    `;
    document.getElementById('btn-header-nav').addEventListener('click', () => {
      stopPolling();
      uiState = 'landing';
      announce(COPY.brand.joinAction);
      render();
      focusCardHeading();
    });
  } else {
    headerFacilitatorContainerEl.innerHTML = `
      <button id="btn-header-nav" class="btn btn-secondary btn-sm">
        ${COPY.brand.facilitatorAction}
      </button>
    `;
    document.getElementById('btn-header-nav').addEventListener('click', () => {
      stopPolling();
      if (!isDemoMode && !isBackendConfigured()) {
        uiState = 'unconfigured';
      } else {
        uiState = 'facilitator-create';
      }
      announce(COPY.creation.heading);
      render();
      focusCardHeading();
    });
  }
}

/**
 * Main View Router
 */
function renderViewCard() {
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
      break;
    case 'facilitator-create':
      renderFacilitatorCreateView();
      break;
    case 'facilitator-dashboard':
      renderFacilitatorDashboardView();
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

/**
 * View 0: Unconfigured Development Screen
 */
function renderUnconfiguredView() {
  viewCardEl.innerHTML = `
    <span class="step-badge">Configuration Supabase</span>
    <h2 class="main-heading">Projet Supabase non configuré</h2>
    <p class="subheading">Pour utiliser les sessions multi-appareils en réseau réel, configurez les identifiants Supabase dans <code>src/config.js</code>.</p>

    <div class="info-explanation-block" style="max-width: 680px;">
      <h4 class="info-explanation-title">Instructions d’installation :</h4>
      <ol style="margin-left: 1.25rem; margin-top: 0.5rem; line-height: 1.6; color: var(--ink-soft);">
        <li>Exécutez le script SQL d’inspection preflight : <code>supabase/preflight-team-pulse.sql</code></li>
        <li>Exécutez le script d’installation principal : <code>supabase/install-team-pulse.sql</code></li>
        <li>Saisissez l’URL et la clé publique (publishable key) dans <code>src/config.js</code>.</li>
      </ol>
    </div>

    <div class="action-bar">
      <a href="?demo=1" class="btn btn-primary">Lancer le mode démo local (?demo=1)</a>
    </div>
  `;
}

/**
 * View 1: Participant Landing Screen
 */
function renderLandingView() {
  viewCardEl.innerHTML = `
    <span class="step-badge">Team Pulse</span>
    <h2 class="main-heading">${COPY.landing.heading}</h2>
    <p class="subheading">${COPY.landing.body}</p>

    ${errorMessage ? `<div class="warning-box" role="alert">${errorMessage}</div>` : ''}

    <form id="landing-form" style="max-width: 480px;">
      <div style="margin-bottom: 1.5rem;">
        <label for="room-code-input" class="option-title" style="display: block; margin-bottom: 0.5rem;">
          ${COPY.landing.inputLabel}
        </label>
        <input 
          type="text" 
          id="room-code-input" 
          class="btn btn-secondary" 
          style="width: 100%; font-size: 1.25rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; text-align: center; padding: 0.85rem;" 
          placeholder="${COPY.landing.placeholder}" 
          maxlength="6"
          autocomplete="off"
          required
        />
      </div>

      <div class="action-bar">
        <button type="submit" class="btn btn-primary" style="flex: 1;">${COPY.landing.submitBtn}</button>
      </div>
    </form>

    <div style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--line);">
      <button id="btn-goto-create" class="btn btn-secondary btn-sm">
        ${COPY.landing.createSessionBtn}
      </button>
    </div>
  `;

  const form = document.getElementById('landing-form');
  const codeInput = document.getElementById('room-code-input');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage = null;
    const normalized = normalizeRoomCode(codeInput.value);

    if (!isValidRoomCode(normalized)) {
      errorMessage = COPY.landing.errors.empty;
      renderLandingView();
      return;
    }

    if (!isDemoMode && !isBackendConfigured()) {
      uiState = 'unconfigured';
      render();
      return;
    }

    try {
      const pub = await apiGetPublicRoom(normalized, isDemoMode);
      activeRoomCode = normalized;
      roomStatus = pub.status;
      uiState = 'voting';
      announce(`Session ${normalized} rejoint.`);
      render();
      focusCardHeading();
    } catch (err) {
      if (err.message === 'UNCONFIGURED_BACKEND') {
        uiState = 'unconfigured';
      } else {
        errorMessage = err.message === 'CLOSED' ? COPY.landing.errors.closed :
                       err.message === 'EXPIRED' ? COPY.landing.errors.expired :
                       err.message === 'NOT_FOUND' ? COPY.landing.errors.notFound :
                       COPY.landing.errors.network;
      }
      renderLandingView();
    }
  });

  document.getElementById('btn-goto-create').addEventListener('click', () => {
    if (!isDemoMode && !isBackendConfigured()) {
      uiState = 'unconfigured';
    } else {
      uiState = 'facilitator-create';
    }
    announce(COPY.creation.heading);
    render();
    focusCardHeading();
  });
}

/**
 * View 2: Participant Voting Screen
 */
function renderVotingView() {
  const selectedOpt = CANONICAL_OPTIONS.find(o => o.id === selectedOptionId);
  const selectedDesc = selectedOpt ? selectedOpt.supportingText : COPY.voting.tabletDefaultDesc;

  const optionsMarkup = CANONICAL_OPTIONS.map(opt => {
    const isChecked = selectedOptionId === opt.id;
    return `
      <div class="option-tile" data-id="${opt.id}">
        <label class="option-label" for="opt-${opt.id}">
          <div class="option-header">
            ${OPTION_SYMBOLS[opt.id]}
            <input 
              type="radio" 
              id="opt-${opt.id}" 
              name="pulse-option" 
              value="${opt.id}" 
              class="native-radio"
              ${isChecked ? 'checked' : ''}
            />
          </div>
          <span class="option-title">${opt.label}</span>
          <span class="option-desc">${opt.supportingText}</span>
        </label>
      </div>
    `;
  }).join('');

  viewCardEl.innerHTML = `
    <form id="voting-form">
      <fieldset class="options-fieldset">
        <legend class="sr-only">${COPY.voting.heading}</legend>
        <span class="step-badge">Session ${activeRoomCode || ''}</span>
        <h2 class="main-heading">${COPY.voting.heading}</h2>
        <p class="subheading">${COPY.voting.supportingText}</p>

        <div class="options-grid">
          ${optionsMarkup}
        </div>

        <div class="tablet-desc-region" id="tablet-desc-region" aria-live="polite">
          <p class="tablet-desc-text ${!selectedOptionId ? 'tablet-desc-placeholder' : ''}">${selectedDesc}</p>
        </div>
      </fieldset>

      <div class="action-bar">
        <button type="submit" id="btn-continue" class="btn btn-primary" ${!selectedOptionId ? 'disabled' : ''}>
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
      const token = getOrCreateParticipantToken(activeRoomCode);
      await apiSubmitVote(activeRoomCode, selectedOptionId, token, isDemoMode);
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
 * View 4: Participant Submission Receipt Screen
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

  viewCardEl.innerHTML = `
    <span class="step-badge">Session ${activeRoomCode}</span>
    <h2 class="main-heading">${COPY.receipt.heading}</h2>
    <p class="receipt-primary-body">${COPY.receipt.formatBody(activeRoomCode)}</p>

    <div class="receipt-card">
      <p class="receipt-explanation-text">${COPY.receipt.privacyExplanation}</p>
      
      <div class="receipt-handoff-banner">
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

      // Update URL to facilitator admin URL
      window.history.pushState(null, '', buildFacilitatorUrl(code, adminSecret));

      uiState = 'facilitator-dashboard';
      startPolling();
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
 * View 6: Facilitator Active Dashboard
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
      announce('Actualisé.');
    } catch (_) {}
  });

  document.getElementById('btn-close-room').addEventListener('click', async () => {
    try {
      await apiCloseRoom(activeRoomCode, activeAdminSecret, isDemoMode);
      stopPolling();
      roomStatus = 'closed';
      uiState = 'facilitator-closed';
      announce(COPY.facilitatorDashboard.closedHeading);
      render();
      focusCardHeading();
    } catch (_) {}
  });
}

/**
 * View 7: Facilitator Closed Screen
 */
function renderFacilitatorClosedView() {
  const countText = formatRoomResponseCount(roomTotalVotes);

  viewCardEl.innerHTML = `
    <span class="step-badge">Session ${activeRoomCode}</span>
    <h2 class="main-heading">${COPY.facilitatorDashboard.closedHeading}</h2>
    <p class="subheading">${COPY.facilitatorDashboard.closedBody}</p>

    <div class="results-total-line" style="margin-bottom: 2rem;">${countText}</div>

    <div class="action-bar">
      <button id="btn-reveal-results" class="btn btn-primary">${COPY.facilitatorDashboard.revealBtn}</button>
      <button id="btn-delete-room-init" class="btn btn-danger">${COPY.facilitatorDashboard.deleteBtn}</button>
    </div>
  `;

  document.getElementById('btn-reveal-results').addEventListener('click', async () => {
    try {
      const state = await apiGetFacilitatorState(activeRoomCode, activeAdminSecret, isDemoMode);
      roomCounts = state.counts || createEmptyCounts();
      roomTotalVotes = state.total;
      uiState = 'facilitator-revealed';
      announce(COPY.facilitatorRevealed.heading);
      render();
      focusCardHeading();
    } catch (_) {}
  });

  document.getElementById('btn-delete-room-init').addEventListener('click', () => {
    uiState = 'facilitator-delete-confirm';
    announce(COPY.deletionConfirmation.heading);
    render();
    focusCardHeading();
  });
}

/**
 * View 8: Facilitator Revealed Results View
 */
function renderFacilitatorRevealedView() {
  const percentages = getPercentages(roomCounts);
  const insight = calculateInsight(roomCounts);
  const vis = generatePulseDataVisualization(percentages);
  const totalLineText = formatRoomResponseCount(roomTotalVotes);

  const nodesSvgMarkup = vis.points.map((pt, idx) => {
    const opt = CANONICAL_OPTIONS[idx];
    return `<circle class="pulse-node-circle" cx="${pt.x}" cy="${pt.y}" fill="${opt.colorHex}" />`;
  }).join('');

  const distributionColsMarkup = CANONICAL_OPTIONS.map(opt => {
    const count = Number(roomCounts[opt.id]) || 0;
    const pct = percentages[opt.id] || 0;
    return `
      <div class="dist-col">
        <div class="dist-col-header">
          <span class="dist-col-dot" style="background-color: ${opt.colorVar};"></span>
          <span>${opt.label}</span>
        </div>
        <div class="dist-col-val">${count} <span class="dist-col-pct">(${pct}%)</span></div>
        <div class="dist-bar-track" aria-hidden="true">
          <div class="dist-bar-fill" style="width: ${pct}%; background-color: ${opt.colorVar};"></div>
        </div>
      </div>
    `;
  }).join('');

  viewCardEl.innerHTML = `
    <span class="step-badge">Session ${activeRoomCode}</span>
    <h2 class="main-heading">${COPY.facilitatorRevealed.heading}</h2>
    <div class="results-total-line">${totalLineText}</div>

    <div class="pulse-visualization-wrapper">
      <h3 class="section-title u-mb-0">${COPY.facilitatorRevealed.distributionTitle}</h3>
      
      <div class="pulse-svg-container" aria-hidden="true">
        <svg class="pulse-svg-element" viewBox="0 0 500 120" preserveAspectRatio="none">
          <path class="pulse-data-path" d="${vis.pathD}" />
          ${nodesSvgMarkup}
        </svg>
      </div>

      <div class="distribution-columns">
        ${distributionColsMarkup}
      </div>
    </div>

    <div class="observation-card">
      <h3 class="section-title">${COPY.facilitatorRevealed.observationHeading}</h3>
      <p class="observation-text">${insight.observation || insight.emptyMessage}</p>
    </div>

    <div class="conversation-card">
      <h3 class="section-title">${COPY.facilitatorRevealed.conversationHeading}</h3>
      <p class="conversation-prompt-text">${insight.prompt || ''}</p>
      <p class="conversation-instruction">${COPY.facilitatorRevealed.conversationInstruction}</p>
    </div>

    <p class="results-disclaimer">${COPY.facilitatorRevealed.disclaimer}</p>

    <div class="action-bar">
      <button id="btn-delete-room-init" class="btn btn-danger">${COPY.facilitatorRevealed.deleteBtn}</button>
    </div>
  `;

  document.getElementById('btn-delete-room-init').addEventListener('click', () => {
    uiState = 'facilitator-delete-confirm';
    announce(COPY.deletionConfirmation.heading);
    render();
    focusCardHeading();
  });
}

/**
 * View 9: Facilitator Deletion Confirmation Dialog
 */
function renderFacilitatorDeleteConfirmView() {
  viewCardEl.innerHTML = `
    <h2 class="main-heading u-color-danger">${COPY.deletionConfirmation.heading}</h2>
    <div class="warning-box">
      ${COPY.deletionConfirmation.body}
    </div>

    <div class="action-bar">
      <button id="btn-confirm-delete" class="btn btn-danger">${COPY.deletionConfirmation.confirmBtn}</button>
      <button id="btn-cancel-delete" class="btn btn-secondary">${COPY.deletionConfirmation.cancelBtn}</button>
    </div>
  `;

  document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    uiState = roomStatus === 'closed' ? 'facilitator-closed' : 'facilitator-dashboard';
    announce('Suppression annulée.');
    render();
    focusCardHeading();
  });

  document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
    try {
      await apiDeleteRoom(activeRoomCode, activeAdminSecret, isDemoMode);
      stopPolling();
      activeRoomCode = null;
      activeAdminSecret = null;
      window.history.pushState(null, '', window.location.pathname);
      uiState = 'landing';
      announce('Session supprimée.');
      render();
      focusCardHeading();
    } catch (_) {
      stopPolling();
      activeRoomCode = null;
      activeAdminSecret = null;
      uiState = 'landing';
      render();
    }
  });
}

/**
 * Global Render Dispatcher
 */
function render() {
  renderHeaderButton();
  renderViewCard();
}

// Initial Kickoff
initApp();
