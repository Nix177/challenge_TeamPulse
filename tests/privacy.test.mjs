import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RUNTIME_FILES = [
  'index.html',
  'styles.css',
  'src/options.js',
  'src/model.js',
  'src/insight.js',
  'src/copy.js',
  'src/visualisation.js',
  'src/app.js'
];

test('Runtime files do not contain forbidden persistence or network APIs', () => {
  const forbiddenPatterns = [
    /localStorage/i,
    /sessionStorage/i,
    /indexedDB/i,
    /\bcookie\b/i,
    /serviceWorker/i,
    /\bfetch\s*\(/i,
    /XMLHttpRequest/i,
    /WebSocket/i,
    /EventSource/i,
    /analytics/i,
    /gtag/i,
    /telemetry/i
  ];

  for (const relPath of RUNTIME_FILES) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    for (const pattern of forbiddenPatterns) {
      assert.equal(
        pattern.test(content),
        false,
        `File ${relPath} matches forbidden privacy pattern: ${pattern.toString()}`
      );
    }
  }
});

test('Runtime files do not contain remote external URLs (fonts, scripts, images)', () => {
  const urlPattern = /https?:\/\/(?!localhost|127\.0\.0\.1)/i;

  for (const relPath of RUNTIME_FILES) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    assert.equal(
      urlPattern.test(content),
      false,
      `File ${relPath} contains an external remote URL!`
    );
  }
});

test('Runtime JavaScript files do not log participant choices to console', () => {
  const jsFiles = ['src/options.js', 'src/model.js', 'src/insight.js', 'src/copy.js', 'src/visualisation.js', 'src/app.js'];

  for (const relPath of jsFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    assert.equal(
      /console\.(log|warn|error|debug|info)/i.test(content),
      false,
      `File ${relPath} contains console logging which is prohibited for privacy!`
    );
  }
});
