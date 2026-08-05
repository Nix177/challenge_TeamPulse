import { CANONICAL_OPTIONS } from './options.js';
import {
  createEmptyCounts,
  getTotalVotes,
  addVote,
  getPercentages,
  createDemoCounts,
  formatTotalResponsesFrench
} from './model.js';
import { calculateInsight } from './insight.js';

/* Abstract SVG symbols for options (restrained, non-childish) */
const OPTION_SYMBOLS = {
  'very-difficult': `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-very-difficult)" stroke-width="2.5" stroke-linecap="round"><path d="M4 16c4-4 8 4 12-4s4 0 4 0"/></svg>`,
  'difficult': `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-difficult)" stroke-width="2.5" stroke-linecap="round"><path d="M5 19L19 5M5 12h8"/></svg>`,
  'mixed': `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-mixed)" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="12" x2="20" y2="12"/><circle cx="8" cy="8" r="1.5" fill="var(--color-mixed)"/><circle cx="16" cy="16" r="1.5" fill="var(--color-mixed)"/></svg>`,
  'good': `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-good)" stroke-width="2.5" stroke-linecap="round"><path d="M4 15c5 0 7-6 16-6"/></svg>`,
  'very-good': `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-very-good)" stroke-width="2.5" stroke-linecap="round"><path d="M3 17c4-2 7-10 18-10M12 20v-4"/></svg>`
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
const headerBadgesEl = document.getElementById('header-badges');
const presentationContainerEl = document.getElementById('presentation-container');
const demoContainerEl = document.getElementById('demo-container');
const viewCardEl = document.getElementById('view-card');
const facilitatorToggleContainerEl = document.getElementById('facilitator-toggle-container');
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
 * Moves focus to the main view card container for accessibility.
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
 * Render Header Badges and URL Mode Panels
 */
function initHeaderAndPanels() {
  if (isDemoMode) {
    headerBadgesEl.innerHTML = `<span class="demo-badge">Mode démo</span>`;

    demoContainerEl.innerHTML = `
      <div class="demo-bar">
        <span><strong>Mode démo actif :</strong> Vous pouvez charger des données types de démonstration.</span>
        <button id="btn-load-demo" class="btn btn-secondary" style="min-height: 40px; padding: 0.4rem 0.8rem; font-size: 0.85rem;">Charger les données de démonstration</button>
      </div>
    `;

    document.getElementById('btn-load-demo').addEventListener('click', () => {
      currentCounts = createDemoCounts();
      uiState = 'results-intro';
      announce('Données de démonstration chargées.');
      render();
      focusCardHeading();
    });
  }

  if (isPresentMode) {
    presentationContainerEl.innerHTML = `
      <details class="presentation-panel">
        <summary class="presentation-summary">Derrière le prototype</summary>
        <div class="presentation-body">
          <ul>
            <li><strong>Besoin</strong> — faciliter une expression collective rapide lors d'un atelier.</li>
            <li><strong>Périmètre</strong> — un appareil unique en présentiel, une session, aucune conservation de données.</li>
            <li><strong>Architecture</strong> — HTML5 sémantique, CSS3 moderne, ES Modules JavaScript et état uniquement en mémoire.</li>
            <li><strong>Validation</strong> — tests unitaires automatisés, contrôles de confidentialité et vérification navigateur.</li>
            <li><strong>Limite principale</strong> — l’absence d’identification ne garantit pas l’anonymat contextuel dans un petit groupe.</li>
          </ul>
        </div>
      </details>
    `;
  }
}

/**
 * Render Facilitator Footer Link
 */
function renderFacilitatorFooterLink() {
  const isFacilitatorView = ['results-intro', 'results-revealed', 'reset-confirmation'].includes(uiState);
  
  if (isFacilitatorView) {
    facilitatorToggleContainerEl.innerHTML = `
      <button id="btn-toggle-voting" class="btn-link">Revenir au vote</button>
    `;
    document.getElementById('btn-toggle-voting').addEventListener('click', () => {
      uiState = 'voting';
      announce('Retour au mode de vote participant.');
      render();
      focusCardHeading();
    });
  } else {
    facilitatorToggleContainerEl.innerHTML = `
      <button id="btn-toggle-results" class="btn-link">Voir les résultats</button>
    `;
    document.getElementById('btn-toggle-results').addEventListener('click', () => {
      uiState = 'results-intro';
      announce('Accès au mode facilitateur.');
      render();
      focusCardHeading();
    });
  }
}

/**
 * Render Main Dynamic View Card
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
      renderThankedView();
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
 * View 1: Participant Voting
 */
function renderVotingView() {
  const optionsMarkup = CANONICAL_OPTIONS.map(opt => {
    const isChecked = selectedOptionId === opt.id;
    return `
      <div class="option-item">
        <label class="option-label" for="opt-${opt.id}">
          <input 
            type="radio" 
            id="opt-${opt.id}" 
            name="pulse-option" 
            value="${opt.id}" 
            class="native-radio"
            ${isChecked ? 'checked' : ''}
          />
          <span class="option-symbol">${OPTION_SYMBOLS[opt.id]}</span>
          <span class="option-text-container">
            <span class="option-title">${opt.label}</span>
            <span class="option-desc">${opt.supportingText}</span>
          </span>
        </label>
      </div>
    `;
  }).join('');

  viewCardEl.innerHTML = `
    <form id="voting-form">
      <fieldset class="options-fieldset">
        <legend class="options-legend">Comment arrives-tu dans cette session aujourd’hui ?</legend>
        <div class="options-list">
          ${optionsMarkup}
        </div>
      </fieldset>
      <div class="btn-group">
        <button type="submit" id="btn-continue" class="btn btn-primary" ${!selectedOptionId ? 'disabled' : ''}>Continuer</button>
      </div>
    </form>
  `;

  // Event Listeners
  const form = document.getElementById('voting-form');
  const continueBtn = document.getElementById('btn-continue');

  form.querySelectorAll('input[name="pulse-option"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedOptionId = e.target.value;
      continueBtn.disabled = false;
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedOptionId) return;
    uiState = 'confirming';
    announce('Étape de confirmation du choix.');
    render();
    focusCardHeading();
  });
}

/**
 * View 2: Confirmation
 */
function renderConfirmingView() {
  const selectedOpt = CANONICAL_OPTIONS.find(o => o.id === selectedOptionId);
  if (!selectedOpt) {
    uiState = 'voting';
    render();
    return;
  }

  viewCardEl.innerHTML = `
    <h2 class="view-heading">Confirmer ton choix</h2>
    <p class="view-subheading">Vérifie ta réponse avant de valider :</p>
    
    <div class="summary-box">
      <span class="option-symbol">${OPTION_SYMBOLS[selectedOpt.id]}</span>
      <div class="option-text-container">
        <span class="option-title">${selectedOpt.label}</span>
        <span class="option-desc">${selectedOpt.supportingText}</span>
      </div>
    </div>

    <div class="btn-group">
      <button id="btn-confirm-vote" class="btn btn-primary">Confirmer mon choix</button>
      <button id="btn-modify-choice" class="btn btn-secondary">Modifier mon choix</button>
    </div>
  `;

  document.getElementById('btn-modify-choice').addEventListener('click', () => {
    uiState = 'voting';
    announce('Retour au formulaire de sélection.');
    render();
    focusCardHeading();
  });

  document.getElementById('btn-confirm-vote').addEventListener('click', () => {
    if (isSubmitting) return; // Prevent rapid duplicate activation
    isSubmitting = true;

    try {
      currentCounts = addVote(currentCounts, selectedOptionId);
      uiState = 'thanked';
      announce('Réponse enregistrée. Merci.');
      render();
      focusCardHeading();
    } finally {
      isSubmitting = false;
    }
  });
}

/**
 * View 3: Thanked Screen
 */
function renderThankedView() {
  viewCardEl.innerHTML = `
    <h2 class="view-heading">Merci.</h2>
    <p class="view-subheading" style="margin-bottom: 2rem;">Ta réponse rejoint le collectif sans être associée à ton nom.</p>
    
    <div class="btn-group">
      <button id="btn-next-participant" class="btn btn-primary">Participant suivant</button>
    </div>
  `;

  document.getElementById('btn-next-participant').addEventListener('click', () => {
    selectedOptionId = null; // Clear prior selection
    uiState = 'voting';
    announce('Nouveau vote participant prêt.');
    render();
    focusCardHeading();
  });
}

/**
 * View 4: Facilitator Results Intro (Pre-Reveal)
 */
function renderResultsIntroView() {
  const total = getTotalVotes(currentCounts);
  const totalText = formatTotalResponsesFrench(total);

  viewCardEl.innerHTML = `
    <h2 class="view-heading">Pouls du groupe</h2>
    <div class="results-total-badge">${totalText}</div>
    <p class="view-subheading" style="font-size: 1.15rem; font-weight: 600; color: var(--text-main); margin-bottom: 2rem;">
      Prêt à découvrir le pouls du groupe ?
    </p>

    <div class="btn-group">
      <button id="btn-reveal-pulse" class="btn btn-primary" ${total === 0 ? 'disabled' : ''}>Révéler le pouls</button>
      <button id="btn-return-voting" class="btn btn-secondary">Revenir au vote</button>
    </div>
  `;

  if (total > 0) {
    document.getElementById('btn-reveal-pulse').addEventListener('click', () => {
      uiState = 'results-revealed';
      announce('Répartition du pouls révélée.');
      render();
      focusCardHeading();
    });
  }

  document.getElementById('btn-return-voting').addEventListener('click', () => {
    uiState = 'voting';
    announce('Retour au mode de vote participant.');
    render();
    focusCardHeading();
  });
}

/**
 * View 5: Facilitator Revealed Results
 */
function renderResultsRevealedView() {
  const total = getTotalVotes(currentCounts);
  const percentages = getPercentages(currentCounts);
  const totalText = formatTotalResponsesFrench(total);
  const insight = calculateInsight(currentCounts);

  const distributionMarkup = CANONICAL_OPTIONS.map(opt => {
    const count = Number(currentCounts[opt.id]) || 0;
    const pct = percentages[opt.id] || 0;
    return `
      <div class="dist-item">
        <div class="dist-header">
          <span class="dist-label-container">
            <span class="option-symbol" style="width: 1.25rem; height: 1.25rem;">${OPTION_SYMBOLS[opt.id]}</span>
            <span>${opt.label}</span>
          </span>
          <span class="dist-count-pct">${count} (${pct}%)</span>
        </div>
        <div class="dist-bar-track" aria-hidden="true">
          <div class="dist-bar-fill" style="width: ${pct}%; background-color: ${opt.colorHint};"></div>
        </div>
        <div class="sr-only">${opt.label} : ${count} réponses, soit ${pct} pourcent.</div>
      </div>
    `;
  }).join('');

  // Abstract SVG Pulse Rhythm Line
  const pulseSvgMarkup = `
    <div class="pulse-rhythm-container" aria-hidden="true">
      <svg class="pulse-rhythm-svg" viewBox="0 0 400 40">
        <path d="M 0 20 Q 50 20, 80 20 T 120 10 T 160 30 T 200 5 T 240 35 T 280 20 L 400 20" />
      </svg>
    </div>
  `;

  let insightMarkup = '';
  if (insight.ruleId === 'empty') {
    insightMarkup = `
      <div class="insight-panel">
        <p class="insight-observation">${insight.emptyMessage}</p>
        <p class="insight-disclaimer">${insight.disclaimer}</p>
      </div>
    `;
  } else {
    insightMarkup = `
      <div class="insight-panel">
        <div>
          <h3 class="insight-section-title">Ce que la répartition permet de constater</h3>
          <p class="insight-observation">${insight.observation}</p>
        </div>
        <div>
          <h3 class="insight-section-title">Une question pour ouvrir la discussion</h3>
          <p class="insight-prompt">${insight.prompt}</p>
        </div>
        <p class="insight-disclaimer">${insight.disclaimer}</p>
      </div>
    `;
  }

  viewCardEl.innerHTML = `
    <h2 class="view-heading">Pouls du groupe</h2>
    <div class="results-total-badge">${totalText}</div>

    <div class="distribution-list">
      ${distributionMarkup}
    </div>

    ${pulseSvgMarkup}

    ${insightMarkup}

    <div class="btn-group" style="margin-top: 2rem;">
      <button id="btn-back-to-vote" class="btn btn-secondary">Revenir au vote</button>
      <button id="btn-init-reset" class="btn btn-danger">Réinitialiser la session</button>
    </div>
  `;

  document.getElementById('btn-back-to-vote').addEventListener('click', () => {
    uiState = 'voting';
    announce('Retour au mode de vote participant.');
    render();
    focusCardHeading();
  });

  document.getElementById('btn-init-reset').addEventListener('click', () => {
    uiState = 'reset-confirmation';
    announce('Demande de confirmation pour réinitialiser la session.');
    render();
    focusCardHeading();
  });
}

/**
 * View 6: Inline 2-Step Reset Confirmation
 */
function renderResetConfirmationView() {
  viewCardEl.innerHTML = `
    <h2 class="view-heading" style="color: var(--danger-accent);">Réinitialiser la session</h2>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-md); padding: 1.25rem; margin: 1.25rem 0 2rem 0; color: #991b1b; font-size: 0.95rem; line-height: 1.4;">
      <strong>Attention :</strong> cette action va réinitialiser l’ensemble des réponses enregistrées pour cette session. Les données ne pourront pas être récupérées.
    </div>

    <div class="btn-group">
      <button id="btn-confirm-reset" class="btn btn-danger">Confirmer la réinitialisation</button>
      <button id="btn-cancel-reset" class="btn btn-secondary">Annuler</button>
    </div>
  `;

  document.getElementById('btn-cancel-reset').addEventListener('click', () => {
    uiState = 'results-revealed';
    announce('Réinitialisation annulée.');
    render();
    focusCardHeading();
  });

  document.getElementById('btn-confirm-reset').addEventListener('click', () => {
    currentCounts = createEmptyCounts();
    selectedOptionId = null;
    uiState = 'voting';
    announce('Session réinitialisée. Les compteurs sont à zéro.');
    render();
    focusCardHeading();
  });
}

/**
 * Main Render Loop
 */
function render() {
  renderFacilitatorFooterLink();
  renderViewCard();
}

// Initial Kickoff
initHeaderAndPanels();
render();
