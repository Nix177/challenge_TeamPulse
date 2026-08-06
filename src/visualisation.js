import { OPTION_IDS } from './options.js';

/**
 * Calculates 5 2D coordinate points from option percentages.
 * 
 * @param {Record<string, number>} percentages Map of optionId -> rounded percentage (0-100)
 * @param {number} width SVG Viewbox width (default 500)
 * @param {number} height SVG Viewbox height (default 120)
 * @returns {Array<{ id: string, x: number, y: number, pct: number }>}
 */
export function calculatePulsePoints(percentages = {}, width = 500, height = 120) {
  const paddingX = 40;
  const usableWidth = width - (paddingX * 2);
  const stepX = usableWidth / (OPTION_IDS.length - 1);
  
  const minY = height - 20; // 0% bottom baseline (20px padding)
  const maxY = 20;          // 100% peak height (20px padding)
  const rangeY = minY - maxY;

  return OPTION_IDS.map((id, index) => {
    const rawPct = Number(percentages[id]) || 0;
    const pct = Math.max(0, Math.min(100, rawPct));
    const x = Math.round((paddingX + (index * stepX)) * 10) / 10;
    const y = Math.round((minY - ((pct / 100) * rangeY)) * 10) / 10;
    return { id, x, y, pct };
  });
}

/**
 * Generates a smooth cubic Bézier SVG path string connecting the 5 data points.
 * 
 * @param {Array<{ x: number, y: number }>} points 
 * @returns {string} SVG path data string
 */
export function generateCubicPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    
    // Control point offset for smooth horizontal wave
    const cpOffset = (p1.x - p0.x) * 0.45;
    const cp1x = Math.round((p0.x + cpOffset) * 10) / 10;
    const cp1y = p0.y;
    const cp2x = Math.round((p1.x - cpOffset) * 10) / 10;
    const cp2y = p1.y;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }

  return d;
}

/**
 * Main entry point: Generates full SVG data visualization from percentages for revealed results.
 * 
 * @param {Record<string, number>} percentages 
 * @returns {{ points: Array<{ id: string, x: number, y: number, pct: number }>, pathD: string, isValid: boolean }}
 */
export function generatePulseDataVisualization(percentages) {
  const points = calculatePulsePoints(percentages);
  const pathD = generateCubicPath(points);

  const hasNaN = pathD.includes('NaN') || pathD.includes('undefined');
  const isValid = !hasNaN && points.length === 5;

  return {
    points,
    pathD,
    isValid
  };
}

/**
 * Generates a privacy-preserving, neutral participation pulse visualization structure
 * based SOLELY on the total number of submitted responses.
 * 
 * PRIVACY GUARANTEE: Does NOT accept or encode option IDs, category counts, or proportions.
 * 
 * @param {number} total Total number of responses (>= 0)
 * @param {number} width SVG viewBox width (default 500)
 * @param {number} height SVG viewBox height (default 120)
 * @param {number} cap Display cap for individual nodes (default 20)
 * @returns {{ total: number, visibleCount: number, cap: number, pathD: string, nodes: Array<{ index: number, x: number, y: number, r: number, isLatest: boolean }>, overflow: { hasOverflow: boolean, overflowCount: number, text: string }, isValid: boolean }}
 */
export function generateParticipationPulse(total = 0, width = 500, height = 120, cap = 20) {
  const safeTotal = Math.max(0, Math.floor(Number(total) || 0));
  const visibleCount = Math.min(safeTotal, cap);
  const paddingX = 40;
  const usableWidth = width - (paddingX * 2);
  const centerY = height / 2; // 60

  const pathD = `M 20 ${centerY} C 120 ${centerY - 25}, 180 ${centerY + 25}, 250 ${centerY} C 320 ${centerY - 25}, 380 ${centerY + 25}, 480 ${centerY}`;

  const nodes = [];
  if (visibleCount > 0) {
    const stepX = visibleCount > 1 ? usableWidth / (visibleCount - 1) : 0;
    const startX = visibleCount === 1 ? width / 2 : paddingX;

    for (let i = 0; i < visibleCount; i++) {
      const x = Math.round((visibleCount === 1 ? startX : startX + (i * stepX)) * 10) / 10;
      const offsetFactor = Math.sin((i + 1) * 1.5);
      const y = Math.round((centerY + (offsetFactor * 18)) * 10) / 10;
      const r = i === visibleCount - 1 ? 7 : 5;
      nodes.push({ index: i + 1, x, y, r, isLatest: i === visibleCount - 1 });
    }
  }

  const hasOverflow = safeTotal > cap;
  const overflowCount = hasOverflow ? safeTotal - cap : 0;

  return {
    total: safeTotal,
    visibleCount,
    cap,
    pathD,
    nodes,
    overflow: {
      hasOverflow,
      overflowCount,
      text: hasOverflow ? `+${overflowCount}` : ''
    },
    isValid: !isNaN(safeTotal)
  };
}

/**
 * Renders the HTML SVG string for neutral participation pulse visual.
 * 
 * @param {number} total 
 * @returns {string} SVG HTML string
 */
export function renderParticipationPulseSvg(total = 0) {
  const data = generateParticipationPulse(total);
  const { pathD, nodes, overflow, total: safeTotal } = data;

  const nodeElements = nodes.map(n => {
    const className = n.isLatest ? 'pulse-node pulse-node-latest' : 'pulse-node';
    return `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" class="${className}" />`;
  }).join('');

  const overflowMarkup = overflow.hasOverflow ? `
    <g class="pulse-overflow-group">
      <circle cx="465" cy="60" r="14" class="pulse-overflow-bg" />
      <text x="465" y="64" text-anchor="middle" class="pulse-overflow-text">${overflow.text}</text>
    </g>
  ` : '';

  const pulseLineClass = safeTotal > 0 ? 'pulse-line pulse-line-active' : 'pulse-line';

  return `
    <svg class="participation-pulse-svg" viewBox="0 0 500 120" aria-hidden="true" fill="none">
      <path d="${pathD}" class="${pulseLineClass}" />
      ${nodeElements}
      ${overflowMarkup}
    </svg>
  `.trim();
}
