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
  'src/config.js',
  'src/session.js',
  'src/api.js',
  'src/app.js'
];

test('Runtime files do not contain forbidden persistence or tracking APIs', () => {
  const forbiddenPatterns = [
    /localStorage/i,
    /indexedDB/i,
    /\bcookie\b/i,
    /serviceWorker/i,
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

test('Network fetch requests are restricted strictly to configured Supabase origin', () => {
  const allowedOriginsPattern = /https:\/\/[a-z0-9_-]+\.supabase\.co/i;
  
  for (const relPath of RUNTIME_FILES) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    // Extract all URLs matching http(s)://
    const matches = content.match(/https?:\/\/[^\s"'`]+/gi) || [];
    for (const urlStr of matches) {
      const isPlaceholder = urlStr.includes('YOUR_SUPABASE_PROJECT_ID');
      const isAllowedOrigin = allowedOriginsPattern.test(urlStr) || urlStr.includes('localhost') || urlStr.includes('127.0.0.1');
      
      assert.equal(
        isAllowedOrigin || isPlaceholder,
        true,
        `File ${relPath} contains an unauthorized remote network URL: ${urlStr}`
      );
    }
  }
});

test('Runtime JavaScript files do not log participant choices or data to console', () => {
  const jsFiles = [
    'src/options.js',
    'src/model.js',
    'src/insight.js',
    'src/copy.js',
    'src/visualisation.js',
    'src/config.js',
    'src/session.js',
    'src/api.js',
    'src/app.js'
  ];

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
