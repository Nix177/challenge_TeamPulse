import { CANONICAL_OPTIONS } from './options.js';

/**
 * Strict validator for aggregate counts object.
 * Returns true if counts contains valid numeric values for all 5 canonical options.
 * 
 * @param {any} counts 
 * @returns {boolean}
 */
export function hasValidCounts(counts) {
  if (!counts || typeof counts !== 'object') return false;
  const keys = ['very-difficult', 'difficult', 'mixed', 'good', 'very-good'];
  return keys.every(k => typeof counts[k] === 'number' && !isNaN(counts[k]) && counts[k] >= 0);
}

/**
 * Computes structured pulse profile data for aggregate counts.
 * 
 * @param {Record<string, number>} counts 
 * @returns {{ total: number, categories: Array<{ id: string, label: string, supportingText: string, count: number, percentage: number, colorVar: string, colorHex: string }>, ariaLabel: string, isValid: boolean }}
 */
export function generatePulseProfileData(counts = {}) {
  const safeCounts = {};
  let total = 0;

  CANONICAL_OPTIONS.forEach(opt => {
    const raw = Number(counts[opt.id]);
    const val = isNaN(raw) || raw < 0 ? 0 : Math.floor(raw);
    safeCounts[opt.id] = val;
    total += val;
  });

  const rawPercentages = {};
  let pctSum = 0;

  CANONICAL_OPTIONS.forEach(opt => {
    if (total === 0) {
      rawPercentages[opt.id] = 0;
    } else {
      const pct = Math.round((safeCounts[opt.id] / total) * 100);
      rawPercentages[opt.id] = pct;
      pctSum += pct;
    }
  });

  // Adjust rounding difference on segment with largest count if pctSum !== 100 (when total > 0)
  if (total > 0 && pctSum !== 100) {
    const diff = 100 - pctSum;
    let maxOptId = CANONICAL_OPTIONS[0].id;
    let maxCount = -1;

    CANONICAL_OPTIONS.forEach(opt => {
      if (safeCounts[opt.id] > maxCount) {
        maxCount = safeCounts[opt.id];
        maxOptId = opt.id;
      }
    });

    rawPercentages[maxOptId] = Math.max(0, rawPercentages[maxOptId] + diff);
  }

  const categories = CANONICAL_OPTIONS.map(opt => ({
    id: opt.id,
    label: opt.label,
    supportingText: opt.supportingText,
    count: safeCounts[opt.id],
    percentage: rawPercentages[opt.id],
    colorVar: opt.colorVar,
    colorHex: opt.colorHex
  }));

  const ariaLabel = `Répartition de ${total} ${total <= 1 ? 'réponse' : 'réponses'} : ${categories.map(c => `${c.label} ${c.count}`).join(', ')}.`;
  const hasNaN = categories.some(s => isNaN(s.count) || isNaN(s.percentage));

  return {
    total,
    categories,
    ariaLabel,
    isValid: !hasNaN && categories.length === 5
  };
}

/**
 * Backward compatibility helper for legacy stacked bar data structure.
 */
export function generateStackedBarVisualization(counts = {}) {
  const data = generatePulseProfileData(counts);
  return {
    total: data.total,
    segments: data.categories,
    isValid: data.isValid
  };
}

/**
 * Generates smooth Bezier curve d attribute passing through array of {x, y} points.
 */
function createPulseCurveD(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) * 0.22;
    const cp1y = p1.y + (p2.y - p0.y) * 0.22;
    const cp2x = p2.x - (p3.x - p1.x) * 0.22;
    const cp2y = p2.y - (p3.y - p1.y) * 0.22;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Renders complete, responsive Pulse Profile visualization HTML and SVG.
 * 
 * @param {Record<string, number>} counts 
 * @returns {string} HTML markup
 */
export function renderCollectiveResultVisualization(counts = {}) {
  const data = generatePulseProfileData(counts);
  const { total, categories, ariaLabel } = data;

  if (total === 0) {
    return `
      <div class="pulse-profile-card">
        <div class="empty-state-notice" style="text-align: center; padding: 2.5rem 1rem; color: var(--ink-soft); font-weight: 500;">
          Aucune réponse à afficher.
        </div>
      </div>
    `;
  }

  // SVG parameters
  const svgWidth = 600;
  const svgHeight = 220;
  const colXPositions = [60, 180, 300, 420, 540];
  const baselineY = 165;
  const MAX_VISIBLE_DOTS = 8;
  const dotRadius = 5.5;
  const dotStep = 13.5;

  const points = [];
  const dotsMarkup = [];

  categories.forEach((cat, i) => {
    const colX = colXPositions[i];
    const count = cat.count;
    const visibleDots = Math.min(count, MAX_VISIBLE_DOTS);
    const hasOverflow = count > MAX_VISIBLE_DOTS;
    const overflowCount = count - MAX_VISIBLE_DOTS;

    // Render stacked dots
    for (let k = 0; k < visibleDots; k++) {
      const cy = baselineY - 10 - k * dotStep;
      const delay = (i * 0.05 + k * 0.025).toFixed(3);
      dotsMarkup.push(`
        <circle 
          cx="${colX}" 
          cy="${cy.toFixed(1)}" 
          r="${dotRadius}" 
          fill="${cat.colorHex}" 
          class="pulse-dot" 
          style="animation-delay: ${delay}s;"
        />
      `);
    }

    // Overflow indicator
    if (hasOverflow) {
      const cyOverflow = baselineY - 10 - MAX_VISIBLE_DOTS * dotStep - 2;
      dotsMarkup.push(`
        <text 
          x="${colX}" 
          y="${cyOverflow.toFixed(1)}" 
          text-anchor="middle" 
          fill="${cat.colorHex}" 
          font-size="11" 
          font-weight="800"
          class="pulse-overflow-label"
        >+${overflowCount}</text>
      `);
    }

    // Special 1-response indicator
    if (total === 1 && count === 1) {
      dotsMarkup.push(`
        <text 
          x="${colX}" 
          y="${(baselineY - 26).toFixed(1)}" 
          text-anchor="middle" 
          fill="${cat.colorHex}" 
          font-size="12" 
          font-weight="800"
          class="pulse-single-label"
        >1 (100%)</text>
      `);
    }

    // Category tick on baseline
    dotsMarkup.push(`
      <circle cx="${colX}" cy="${baselineY}" r="2" fill="${count > 0 ? cat.colorHex : 'var(--ink-faint)'}" />
    `);

    // Curve point calculation
    let curveY = baselineY;
    if (total >= 2 && count > 0) {
      const stackHeight = visibleDots * dotStep + (hasOverflow ? 14 : 0);
      curveY = Math.max(30, baselineY - stackHeight - 12);
    }
    points.push({ x: colX, y: curveY });
  });

  let curveMarkup = '';
  if (total >= 2) {
    const curveD = createPulseCurveD(points);
    const areaD = `${curveD} L ${colXPositions[4]} ${baselineY} L ${colXPositions[0]} ${baselineY} Z`;

    curveMarkup = `
      <path d="${areaD}" fill="url(#pulse-fill-gradient)" opacity="0.08" />
      <path d="${curveD}" fill="none" stroke="url(#pulse-stroke-gradient)" stroke-width="3" stroke-linecap="round" class="pulse-profile-line" />
    `;
  }

  const svgMarkup = `
    <svg 
      class="pulse-profile-svg" 
      viewBox="0 0 ${svgWidth} ${svgHeight}" 
      role="img" 
      aria-label="${ariaLabel}"
    >
      <title>${ariaLabel}</title>
      <defs>
        <linearGradient id="pulse-stroke-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#D96B64" />
          <stop offset="25%" stop-color="#E08A68" />
          <stop offset="50%" stop-color="#E5B365" />
          <stop offset="75%" stop-color="#84A98C" />
          <stop offset="100%" stop-color="#2F7C6E" />
        </linearGradient>
        <linearGradient id="pulse-fill-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#D96B64" />
          <stop offset="25%" stop-color="#E08A68" />
          <stop offset="50%" stop-color="#E5B365" />
          <stop offset="75%" stop-color="#84A98C" />
          <stop offset="100%" stop-color="#2F7C6E" />
        </linearGradient>
      </defs>

      <!-- Baseline -->
      <line x1="40" y1="${baselineY}" x2="560" y2="${baselineY}" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="4 4" />

      <!-- Distribution Curve & Fill -->
      ${curveMarkup}

      <!-- Stacked Anonymous Dots & Labels -->
      ${dotsMarkup.join('')}
    </svg>
  `;

  const summaryMarkup = `
    <div class="pulse-profile-summary" aria-hidden="true">
      ${categories.map(c => `
        <div class="pulse-summary-column ${c.count > 0 ? 'is-active' : 'is-muted'}">
          <span class="pulse-summary-label">${c.label}</span>
          <span class="pulse-summary-metrics">${c.count} · ${c.percentage}%</span>
        </div>
      `).join('')}
    </div>
  `;

  return `
    <div class="pulse-profile-card">
      ${svgMarkup}
      ${summaryMarkup}
    </div>
  `;
}
