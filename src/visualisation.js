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
  
  const minY = height - 25; // 0% bottom baseline
  const maxY = 25;          // 100% peak height
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
 * Main entry point: Generates full SVG data visualization from percentages.
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
