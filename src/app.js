import { CANONICAL_OPTIONS } from './options.js';
import {
  createEmptyCounts,
  getTotalVotes,
  addVote,
  getPercentages,
  createDemoCounts
} from './model.js';
import { calculateInsight } from './insight.js';
import {
  COPY,
  formatCollectedCount,
  formatSupportingCount,
  formatPreRevealHeading,
  formatSubmissionLiveAnnounce
} from './copy.js';
import { generatePulseDataVisualization } from './visualisation.js';

/* Abstract SVG symbols for canonical options */
const OPTION_SYMBOLS = {
  'very-difficult': `<svg class="option-symbol-glyph" viewBox="0 0 24 24" fill="none" stroke="var(--tone-1)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 3 16 Q 8 6 12 16 T 21 16"/></svg>`,
  'difficult': `<svg class="option-symbol-glyph" viewBox="0 0 24 24" fill="none" stroke="var(--tone-2)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 4 18 L 20 6 M 4 12 H 12"/></svg>`,
  'mixed': `<svg class="option-symbol-glyph" viewBox="0 0 24 24" fill="none" stroke="var(--tone-3)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="12" x2="20" y2="12"/><circle cx="7" cy="7" r="2" fill="var(--tone-3)"/><circle cx="17" cy="17" r="2" fill="var(--tone-3)"/></svg>`,
  'good': `<svg class="option-symbol-glyph" viewBox="0 0 24 24" fill="none" stroke="var(--tone-4)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 3 16 Q 10 4 21 12"/></svg>`,
  'very-good': `<svg class="option-symbol-glyph" viewBox="0 0 24 24" fill="none" stroke="var(--tone-5)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 2 18 Q 8 10 14 4 T 22 8 M 14 18 V 14"/></svg>`
};

/* Application State */
let currentCounts = createEmptyCounts();
let selectedOptionId = null;
let uiState = 'voting'; // voting | confirming | thanked | results-intro | results-revealed | reset-confirmation
let isSubmitting = false;

/* URL Mode Flags */
const searchParams = new URLSearchParams(window.location.search);
const isDemoMode = searchParams.get('demo') === '1';
const isPresentMode = searchParams.get('present') === '1';

/* DOM Elements */
const presentationContainerEl = document.getElementById('presentation-container');
const demoContainerEl = document.getElementById('demo-container');
const viewCardEl = document.getElementById('view-card');
const headerFacilitatorContainerEl = document.getElementById('header-facilitator-container');
const ariaAnnounceEl = document.getElementById('aria-announce');

/**
 * Announces message to screen readers via ARIA live region.
 */
function announce(message) {
  if (ariaAnnounceEl) {
    ariaAnnounceEl.textContent = message;
  }
}

/**
 * Focuses card heading or view container for accessible keyboard focus management.
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
 * Initialize Header Controls & URL Mode Panels
 */
function initPanels() {
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
      currentCounts = createDemoCounts();
      uiState = 'results-intro';
      announce(COPY.demo.loadedAnnounce);
      render();
      focusCardHeading();
    });
  }

  if (isPresentMode) {
    const sectionsMarkup = COPY.presentation.sections.map(sec => `
      <div class="presentation-section">
        <span class="presentation-section-title">${sec.title}</span>
        <span class="presentation-section-text">${sec.text}</span>
      </div>
    `).join('');

    presentationContainerEl.innerHTML = `
      <details class="presentation-panel">
        <summary class="presentation-summary">${COPY.presentation.closedLabel}</summary>
        <div class="presentation-body">
          <h2 class="presentation-heading">${COPY.presentation.openHeading}</h2>
          ${sectionsMarkup}
          <p class="presentation-conclusion">${COPY.presentation.conclusion}</p>
        </div>
      </details>
    `;
  }
}

/**
 * Render Header Facilitator Action Button
 */
function renderHeaderFacilitatorButton() {
  const isFacilitatorView = ['results-intro', 'results-revealed', 'reset-confirmation'].includes(uiState);

  if (isFacilitatorView) {
    headerFacilitatorContainerEl.innerHTML = `
      <button id="btn-header-nav" class="btn btn-secondary btn-sm">
        ${COPY.brand.returnAction}
      </button>
    `;
    document.getElementById('btn-header-nav').addEventListener('click', () => {
      uiState = 'voting';
      announce('Retour au questionnaire.');
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
      uiState = 'results-intro';
      announce('Accès aux résultats.');
      render();
      focusCardHeading();
    });
  }
}

/**
 * Main View Dispatcher
 */
function renderViewCard() {
  switch (uiState) {
    case 'voting':
      renderVotingView();
      break;
    case 'confirming':
      renderConfirmingView();
      break;
    case 'thanked':
      renderReceiptView();
      break;
    case 'results-intro':
      renderResultsIntroView();
      break;
    case 'results-revealed':
      renderResultsRevealedView();
      break;
    case 'reset-confirmation':
      renderResetConfirmationView();
      break;
    default:
      renderVotingView();
  }
}

/**
 * View 1: Participant Voting Screen
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
        <span class="step-badge">${COPY.voting.stepLabel}</span>
        <h2 class="main-heading">${COPY.voting.heading}</h2>
        <p class="subheading">${COPY.voting.supportingText}</p>

        <div class="options-grid">
          ${optionsMarkup}
        </div>

        <!-- Tablet Description Region -->
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
 * View 2: Confirmation Screen
 */
function renderConfirmingView() {
  const selectedOpt = CANONICAL_OPTIONS.find(o => o.id === selectedOptionId);
  if (!selectedOpt) {
    uiState = 'voting';
    render();
    return;
  }

  viewCardEl.innerHTML = `
    <span class="step-badge">${COPY.confirmation.stepLabel}</span>
    <h2 class="main-heading">${COPY.confirmation.heading}</h2>
    <p class="subheading">${COPY.confirmation.supportingText}</p>

    <!-- Selected response summary marker -->
    <div class="confirmation-summary-card" style="--summary-accent: ${selectedOpt.colorVar};">
      ${OPTION_SYMBOLS[selectedOpt.id]}
      <div>
        <h3 class="option-title confirmation-title">${selectedOpt.label}</h3>
        <p class="option-desc confirmation-desc">${selectedOpt.supportingText}</p>
      </div>
    </div>

    <!-- Calm explanation block -->
    <div class="info-explanation-block">
      <h4 class="info-explanation-title">${COPY.confirmation.infoBlockHeading}</h4>
      <p class="info-explanation-body">${COPY.confirmation.infoBlockBody}</p>
      <p class="info-explanation-privacy">${COPY.confirmation.privacyLine}</p>
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

  document.getElementById('btn-confirm-vote').addEventListener('click', () => {
    if (isSubmitting) return; // Single-submission lock
    isSubmitting = true;

    try {
      currentCounts = addVote(currentCounts, selectedOptionId);
      const newTotal = getTotalVotes(currentCounts);
      uiState = 'thanked';
      announce(formatSubmissionLiveAnnounce(newTotal));
      render();
      focusCardHeading();
    } finally {
      isSubmitting = false;
    }
  });
}

/**
 * View 3: Submission Receipt Screen
 */
function renderReceiptView() {
  const total = getTotalVotes(currentCounts);
  const countText = formatCollectedCount(total);

  // Dynamic neutral dots: show existing dots up to total - 1 (max 4), plus 1 joining green dot
  const existingCount = Math.min(total - 1, 4);
  const existingDotsMarkup = Array(existingCount).fill('<span class="neutral-dot existing-dot"></span>').join('');
  const dotsClusterMarkup = `${existingDotsMarkup}<span class="neutral-dot joining-dot"></span>`;

  viewCardEl.innerHTML = `
    <span class="step-badge">${COPY.receipt.stepLabel}</span>
    <h2 class="main-heading">${COPY.receipt.heading}</h2>
    <p class="receipt-primary-body">${COPY.receipt.primaryBody}</p>

    <!-- Consolidated Receipt Card Container -->
    <div class="receipt-card">
      <div class="receipt-count-banner">
        <span class="receipt-count-number">${total}</span>
        <span class="receipt-count-label">${countText}</span>
      </div>

      <!-- Dynamic Neutral Point-Joining Visual Animation -->
      <div class="receipt-neutral-animation" aria-hidden="true">
        <div class="receipt-dots-cluster">
          ${dotsClusterMarkup}
        </div>
      </div>

      <p class="receipt-explanation-text">${COPY.receipt.explanation}</p>

      <div class="receipt-handoff-banner">
        <svg class="handoff-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M17 1l4 4-4 4"/>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <path d="M7 23l-4-4 4-4"/>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
        <span>${COPY.receipt.handoffInstruction}</span>
      </div>
    </div>

    <div class="action-bar">
      <button id="btn-next-participant" class="btn btn-primary">${COPY.receipt.nextBtn}</button>
      <span class="action-microcopy">${COPY.receipt.microcopy}</span>
    </div>
  `;

  document.getElementById('btn-next-participant').addEventListener('click', () => {
    selectedOptionId = null; // Clear individual choice for next participant
    uiState = 'voting';
    announce('Nouvelle réponse prête.');
    render();
    focusCardHeading();
  });
}

/**
 * View 4: Facilitator Pre-Reveal Screen
 */
function renderResultsIntroView() {
  const total = getTotalVotes(currentCounts);

  if (total === 0) {
    viewCardEl.innerHTML = `
      <h2 class="main-heading">${COPY.facilitatorEmpty.heading}</h2>
      <p class="subheading">${COPY.facilitatorEmpty.body}</p>

      <div class="action-bar">
        <button id="btn-back-voting" class="btn btn-primary">${COPY.facilitatorEmpty.backBtn}</button>
      </div>
    `;

    document.getElementById('btn-back-voting').addEventListener('click', () => {
      uiState = 'voting';
      announce('Retour au questionnaire.');
      render();
      focusCardHeading();
    });
    return;
  }

  const headingText = formatPreRevealHeading(total);

  viewCardEl.innerHTML = `
    <h2 class="main-heading">${headingText}</h2>
    <p class="subheading">${COPY.facilitatorPreReveal.body}</p>

    <div class="thankyou-cluster-container u-mb-lg" aria-hidden="true">
      <svg width="200" height="40" viewBox="0 0 200 40" fill="none" stroke="var(--ink-faint)" stroke-width="2" stroke-dasharray="4 4">
        <path d="M 0 20 Q 50 20, 100 20 T 200 20" />
      </svg>
    </div>

    <div class="action-bar">
      <button id="btn-reveal-pulse" class="btn btn-primary">${COPY.facilitatorPreReveal.revealBtn}</button>
      <button id="btn-back-voting" class="btn btn-secondary">${COPY.facilitatorPreReveal.backBtn}</button>
    </div>
  `;

  document.getElementById('btn-reveal-pulse').addEventListener('click', () => {
    uiState = 'results-revealed';
    announce('Répartition affichée.');
    render();
    focusCardHeading();
  });

  document.getElementById('btn-back-voting').addEventListener('click', () => {
    uiState = 'voting';
    announce('Retour au questionnaire.');
    render();
    focusCardHeading();
  });
}

/**
 * View 5: Facilitator Revealed Results View
 */
function renderResultsRevealedView() {
  const total = getTotalVotes(currentCounts);
  const percentages = getPercentages(currentCounts);
  const insight = calculateInsight(currentCounts);
  const vis = generatePulseDataVisualization(percentages);

  const totalLineText = formatSupportingCount(total);

  // SVG Nodes
  const nodesSvgMarkup = vis.points.map((pt, idx) => {
    const opt = CANONICAL_OPTIONS[idx];
    return `<circle class="pulse-node-circle" cx="${pt.x}" cy="${pt.y}" fill="${opt.colorHex}" />`;
  }).join('');

  // Distribution Columns
  const distributionColsMarkup = CANONICAL_OPTIONS.map(opt => {
    const count = Number(currentCounts[opt.id]) || 0;
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
        <div class="sr-only">${opt.label} : ${count} réponses, soit ${pct} pourcent.</div>
      </div>
    `;
  }).join('');

  viewCardEl.innerHTML = `
    <h2 class="main-heading">${COPY.facilitatorRevealed.heading}</h2>
    <div class="results-total-line">${totalLineText}</div>

    <!-- Visualization Region -->
    <div class="pulse-visualization-wrapper" aria-label="Visualisation de la répartition">
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

    <!-- Observation Region -->
    <div class="observation-card">
      <h3 class="section-title">${COPY.facilitatorRevealed.observationHeading}</h3>
      <p class="observation-text">${insight.observation || insight.emptyMessage}</p>
    </div>

    <!-- Conversation Question (Final Visual Destination) -->
    <div class="conversation-card">
      <h3 class="section-title">${COPY.facilitatorRevealed.conversationHeading}</h3>
      <p class="conversation-prompt-text">${insight.prompt || ''}</p>
      <p class="conversation-instruction">${COPY.facilitatorRevealed.conversationInstruction}</p>
    </div>

    <p class="results-disclaimer">${COPY.facilitatorRevealed.disclaimer}</p>

    <div class="action-bar">
      <button id="btn-back-voting" class="btn btn-secondary">${COPY.facilitatorRevealed.backBtn}</button>
      <button id="btn-init-reset" class="btn btn-danger">${COPY.facilitatorRevealed.resetBtn}</button>
    </div>
  `;

  document.getElementById('btn-back-voting').addEventListener('click', () => {
    uiState = 'voting';
    announce('Retour au questionnaire.');
    render();
    focusCardHeading();
  });

  document.getElementById('btn-init-reset').addEventListener('click', () => {
    uiState = 'reset-confirmation';
    announce('Demande d’effacement.');
    render();
    focusCardHeading();
  });
}

/**
 * View 6: Reset Confirmation Screen
 */
function renderResetConfirmationView() {
  viewCardEl.innerHTML = `
    <h2 class="main-heading u-color-danger">${COPY.resetConfirmation.heading}</h2>
    <div class="warning-box">
      ${COPY.resetConfirmation.body}
    </div>

    <div class="action-bar">
      <button id="btn-confirm-reset" class="btn btn-danger">${COPY.resetConfirmation.confirmBtn}</button>
      <button id="btn-cancel-reset" class="btn btn-secondary">${COPY.resetConfirmation.cancelBtn}</button>
    </div>
  `;

  document.getElementById('btn-cancel-reset').addEventListener('click', () => {
    uiState = 'results-revealed';
    announce('Effacement annulé.');
    render();
    focusCardHeading();
  });

  document.getElementById('btn-confirm-reset').addEventListener('click', () => {
    currentCounts = createEmptyCounts();
    selectedOptionId = null;
    uiState = 'voting';
    announce('Session effacée.');
    render();
    focusCardHeading();
  });
}

/**
 * Global Render Loop
 */
function render() {
  renderHeaderFacilitatorButton();
  renderViewCard();
}

// Initial Kickoff
initPanels();
render();
