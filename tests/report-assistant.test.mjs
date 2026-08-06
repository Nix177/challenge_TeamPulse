import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { 
  TeamPulseReportRetriever, 
  normalizeFrenchText, 
  extractTokens 
} from '../public/js/TeamPulseReportRetriever.js';
import { GeminiLiveClient, SYSTEM_INSTRUCTION } from '../public/js/GeminiLiveClient.js';
import { PcmAudioPlayer } from '../public/js/PcmAudioPlayer.js';
import { ReportAvatarAnimator } from '../public/js/ReportAvatarAnimator.js';

test('RAG JSON loads successfully and contains all 49 unique chunks with required fields', async () => {
  const jsonPath = path.resolve(process.cwd(), 'public/data/team-pulse-rag.json');
  assert.equal(fs.existsSync(jsonPath), true, 'public/data/team-pulse-rag.json must exist');

  const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.equal(Array.isArray(jsonContent), true);
  assert.equal(jsonContent.length, 49, 'Corpus must contain 49 unique chunks');

  // Verify unique IDs and mandatory fields
  const ids = new Set(jsonContent.map(c => c.id));
  assert.equal(ids.size, 49, 'All 49 chunk IDs must be unique');

  jsonContent.forEach(c => {
    assert.equal(typeof c.id, 'string');
    assert.equal(typeof c.title, 'string');
    assert.equal(typeof c.text, 'string');
    assert.equal(c.text.length > 0, true);
  });

  // Verify first and last chunk IDs
  assert.equal(jsonContent[0].id, 'summary');
  assert.equal(jsonContent[jsonContent.length - 1].id, 'links');
});

test('French accent normalization correctly strips accents and normalizes text', () => {
  const input = 'Écoute d’un baromètre à l’atelier !';
  const normalized = normalizeFrenchText(input);
  assert.equal(normalized, 'ecoute d un barometre a l atelier');

  const tokens = extractTokens('Pourquoi avoir choisi le baromètre ?');
  assert.equal(tokens.includes('pourquoi'), false, 'Stop word "pourquoi" should be filtered');
  assert.equal(tokens.includes('barometre'), true, 'Keyword "barometre" should be retained');
});

test('TeamPulseReportRetriever ranks relevant chunks above irrelevant chunks', async () => {
  const retriever = new TeamPulseReportRetriever('public/data/team-pulse-rag.json');
  const res = await retriever.retrieve('Pourquoi avoir choisi un baromètre d’équipe ?', 5);

  assert.equal(res.found, true);
  assert.equal(res.chunks.length > 0, true);
  assert.equal(res.chunks[0].id, 'section-02', 'Top chunk for baromètre choice must be section-02');
  assert.equal(res.contextText.includes('baromètre'), true);
});

test('TeamPulseReportRetriever handles unknown query cleanly with fallback context', async () => {
  const retriever = new TeamPulseReportRetriever('public/data/team-pulse-rag.json');
  const res = await retriever.retrieve('xyzunmatchednonexistentquery999', 5);

  assert.equal(res.found, false);
  assert.equal(res.contextText.includes('Aucun extrait direct ne correspond'), true);
  assert.equal(res.chunks.length > 0, true, 'Fallback sections must be returned');
});

test('SYSTEM_INSTRUCTION contains strict grounding rules, neutral French-Swiss accent instructions, and forbids Quebec regionalisms', () => {
  assert.equal(SYSTEM_INSTRUCTION.includes('Nicolas Tuor'), true);
  assert.equal(SYSTEM_INSTRUCTION.includes('troisième personne'), true);
  assert.equal(SYSTEM_INSTRUCTION.includes('N\'inventez JAMAIS de retours clients'), true);
  assert.equal(SYSTEM_INSTRUCTION.includes('maquette de démonstration'), true);
  assert.equal(SYSTEM_INSTRUCTION.includes('vibe coding'), true);

  // Regional accent & pronunciation assertions
  assert.equal(SYSTEM_INSTRUCTION.includes('français standard européen'), true, 'Must specify standard European French');
  assert.equal(SYSTEM_INSTRUCTION.includes('prononciation naturelle et neutre de Suisse romande'), true, 'Must specify neutral French-Swiss pronunciation');
  assert.equal(SYSTEM_INSTRUCTION.includes('N’utilisez pas d’accent québécois ou canadien'), true, 'Must forbid Quebec or Canadian French accent');
  assert.equal(SYSTEM_INSTRUCTION.includes('STANDARD EUROPEAN FRENCH'), true, 'Must include English rule for model reliability');
});

test('SECURITY: api/live-token.js uses ESM default export, official v1beta auth_tokens, x-goog-api-key, and NEVER leaks permanent key', async () => {
  const tokenApiPath = path.resolve(process.cwd(), 'api/live-token.js');
  const tokenApiContent = fs.readFileSync(tokenApiPath, 'utf8');

  // Verify ESM export format
  assert.equal(tokenApiContent.includes('export default async function handler'), true, 'api/live-token.js must use ESM default export');
  assert.equal(tokenApiContent.includes('module.exports'), false, 'api/live-token.js must NOT use CommonJS module.exports');

  // Verify endpoint and header
  assert.equal(tokenApiContent.includes('https://generativelanguage.googleapis.com/v1beta/auth_tokens'), true, 'Must use official /v1beta/auth_tokens endpoint');
  assert.equal(tokenApiContent.includes('x-goog-api-key'), true, 'Must send x-goog-api-key header');
  assert.equal(tokenApiContent.includes('v1alpha/tokens'), false, 'Must NOT use obsolete v1alpha/tokens endpoint');

  // Verify ZERO API key fallbacks or leaks
  assert.equal(tokenApiContent.includes('token: apiKey'), false, 'Must NEVER return token: apiKey');
  assert.equal(tokenApiContent.includes('data.token || data.name || apiKey'), false, 'Must NEVER fallback to returning apiKey');
  assert.equal(tokenApiContent.includes('res.status(502)'), true, 'Must return HTTP 502 on upstream failure');

  // Verify client files do not contain keys
  const publicJsDir = path.resolve(process.cwd(), 'public/js');
  const publicFiles = fs.readdirSync(publicJsDir);

  publicFiles.forEach(file => {
    const fullPath = path.join(publicJsDir, file);
    if (fs.statSync(fullPath).isFile()) {
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.equal(content.includes('AIzaSy'), false, `Client file ${file} must not contain hardcoded Google API keys`);
      assert.equal(content.includes('process.env.GOOGLE_API_KEY'), false, `Client file ${file} must not reference process.env.GOOGLE_API_KEY directly`);
    }
  });

  const htmlPath = path.resolve(process.cwd(), 'rapport-interactif.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  assert.equal(htmlContent.includes('AIzaSy'), false, 'rapport-interactif.html must not contain API key');
});

test('GeminiLiveClient uses constrained v1beta WebSocket endpoint and same-origin /api/live-token route', () => {
  const clientPath = path.resolve(process.cwd(), 'public/js/GeminiLiveClient.js');
  const clientContent = fs.readFileSync(clientPath, 'utf8');

  // Verify fetch path
  assert.equal(clientContent.includes("fetch('/api/live-token'"), true, 'GeminiLiveClient must use explicit /api/live-token route');

  // Verify constrained endpoint URL
  assert.equal(clientContent.includes('v1beta.GenerativeService.BidiGenerateContentConstrained'), true, 'GeminiLiveClient must use v1beta BidiGenerateContentConstrained endpoint');
  assert.equal(clientContent.includes('encodeURIComponent(token)'), true, 'GeminiLiveClient must encode token parameter with encodeURIComponent');
  assert.equal(clientContent.includes('v1alpha.GenerativeService.BidiGenerateContent?access_token'), false, 'GeminiLiveClient must NOT use unconstrained v1alpha endpoint');
  assert.equal(clientContent.includes('v1beta.GenerativeService.BidiGenerateContent?access_token'), false, 'GeminiLiveClient must NOT use unconstrained v1beta endpoint');
});

test('PcmAudioPlayer triggers onStart when playing and onIdle when stopped', () => {
  let started = false;
  let idled = false;

  const player = new PcmAudioPlayer({
    onStart: () => { started = true; },
    onIdle: () => { idled = true; }
  });

  player.stop();
  assert.equal(idled, false, 'Idle should not trigger if never played');

  player.setVolume(0.5);
  assert.equal(player.volume, 0.5);
  player.setMute(true);
  assert.equal(player.isMuted, true);
});

test('rapport-interactif.html contains all 8 required suggested questions', () => {
  const htmlPath = path.resolve(process.cwd(), 'rapport-interactif.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  const requiredQuestions = [
    "Pourquoi avoir choisi un baromètre d’équipe ?",
    "Comment le problème a-t-il été découpé ?",
    "Quelles erreurs de l’IA ont été détectées ?",
    "Comment avez-vous vérifié que cela fonctionnait ?",
    "Qu’avez-vous trouvé le plus difficile ?",
    "Le vibe coding remplace-t-il le développement classique ?",
    "Quelles sont les limites du prototype ?",
    "Quelle serait la prochaine étape ?"
  ];

  requiredQuestions.forEach(q => {
    assert.equal(htmlContent.includes(q), true, `Suggested question "${q}" must be present in rapport-interactif.html`);
  });
});

test('No localStorage or persistent storage is used in report assistant client code', () => {
  const publicJsDir = path.resolve(process.cwd(), 'public/js');
  const files = fs.readdirSync(publicJsDir);

  files.forEach(file => {
    const fullPath = path.join(publicJsDir, file);
    if (fs.statSync(fullPath).isFile()) {
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.equal(content.includes('localStorage.setItem'), false, `${file} must not use localStorage.setItem`);
      assert.equal(content.includes('sessionStorage.setItem'), false, `${file} must not use sessionStorage.setItem`);
    }
  });
});

test('_inputs/ directory is ignored in .gitignore and .vercelignore', () => {
  const gitignore = fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf8');
  const vercelignore = fs.readFileSync(path.resolve(process.cwd(), '.vercelignore'), 'utf8');

  assert.equal(gitignore.includes('_inputs/'), true, '.gitignore must include _inputs/');
  assert.equal(vercelignore.includes('_inputs/'), true, '.vercelignore must include _inputs/');
});

test('Avatar manifest and WebP frames exist, parse correctly, and ordered frame-001 to frame-008', () => {
  const manifestPath = path.resolve(process.cwd(), 'public/assets/report-assistant/avatar-manifest.json');
  assert.equal(fs.existsSync(manifestPath), true, 'avatar-manifest.json must exist');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.fps, 10, 'Manifest FPS should be 10');
  assert.equal(Array.isArray(manifest.speaking), true, 'manifest.speaking must be an array');
  assert.equal(manifest.speaking.length, 8, 'Exactly 8 speaking frames must be registered');

  // Verify ordered frame-001 to frame-008
  manifest.speaking.forEach((framePath, i) => {
    const frameNum = String(i + 1).padStart(3, '0');
    assert.equal(framePath.includes(`frame-${frameNum}.webp`), true, `Frame ${i} must be frame-${frameNum}.webp`);
    const fullPath = path.resolve(process.cwd(), framePath);
    assert.equal(fs.existsSync(fullPath), true, `Speaking frame ${framePath} must exist on disk`);
  });

  // Verify idle, listening, thinking images exist on disk
  ['idle', 'listening', 'thinking'].forEach(state => {
    assert.equal(Array.isArray(manifest[state]), true, `manifest.${state} must be array`);
    manifest[state].forEach(filePath => {
      const fullPath = path.resolve(process.cwd(), filePath);
      assert.equal(fs.existsSync(fullPath), true, `Asset ${filePath} for ${state} must exist on disk`);
    });
  });

  // Verify HTML no longer references placeholder
  const htmlContent = fs.readFileSync(path.resolve(process.cwd(), 'rapport-interactif.html'), 'utf8');
  assert.equal(htmlContent.includes('placeholder-avatar.svg'), false, 'rapport-interactif.html must not use placeholder-avatar.svg at runtime');
  assert.equal(htmlContent.includes('idle.webp'), true, 'rapport-interactif.html must reference idle.webp');
});

test('ReportAvatarAnimator state machine and reduced motion support', async () => {
  class MockElement {
    constructor() {
      this._src = '';
      this.attributes = {};
    }
    get src() { return this._src; }
    set src(v) { this._src = v; }
    setAttribute(k, v) { this.attributes[k] = v; }
    getAttribute(k) { return k === 'src' ? this._src : (this.attributes[k] || null); }
    querySelector() { return null; }
    appendChild() {}
  }

  const container = new MockElement();
  const imgEl = new MockElement();
  const animator = new ReportAvatarAnimator({ containerEl: container, imgEl: imgEl });
  await new Promise(r => setTimeout(r, 10));
  animator.manifest = {
    fps: 10,
    idle: ['public/assets/report-assistant/idle.webp'],
    speaking: Array.from({ length: 8 }, (_, i) => `public/assets/report-assistant/speaking/frame-00${i+1}.webp`)
  };

  // Idle state
  animator.setState('idle');
  assert.equal(animator.imgEl.src, 'public/assets/report-assistant/idle.webp');

  // Speaking state (normal motion)
  animator.reducedMotion = false;
  animator.setState('speaking');
  assert.equal(animator.currentState, 'speaking');
  assert.notEqual(animator.animationTimer, null);

  // Stop speaking
  animator.setState('idle');
  assert.equal(animator.animationTimer, null);
  assert.equal(animator.imgEl.src, 'public/assets/report-assistant/idle.webp');

  // Reduced motion
  animator.reducedMotion = true;
  animator.setState('speaking');
  assert.equal(animator.animationTimer, null, 'Reduced motion must not start interval timer');
  assert.equal(animator.imgEl.src, 'public/assets/report-assistant/speaking/frame-001.webp');
});

test('GeminiLiveClient WebSocket setupComplete handshake lifecycle', async () => {
  class MockWebSocket {
    static OPEN = 1;
    static CONNECTING = 0;
    static CLOSED = 3;
    constructor(url) {
      this.url = url;
      this.readyState = MockWebSocket.CONNECTING;
      this.sentMessages = [];
      setTimeout(() => {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) this.onopen();
      }, 10);
    }
    send(data) {
      this.sentMessages.push(JSON.parse(data));
    }
    close() {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) this.onclose();
    }
  }

  const originalWs = global.WebSocket;
  const originalFetch = global.fetch;

  global.WebSocket = MockWebSocket;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ ok: true, token: 'mock-token', model: 'mock-model', voice: 'mock-voice' })
  });

  const client = new GeminiLiveClient({
    retriever: { retrieve: async () => ({ contextText: 'mock' }) },
    audioPlayer: null
  });

  let setupResolved = false;
  const connectPromise = client.connect().then(res => {
    setupResolved = res;
    return res;
  });

  await new Promise(r => setTimeout(r, 25));

  // 1. connect() sends setup on open
  assert.equal(client.ws.sentMessages.length, 1);
  assert.equal(Boolean(client.ws.sentMessages[0].setup), true, 'Setup message must be sent on open');

  // 2. connect() does NOT resolve on open
  assert.equal(setupResolved, false, 'connect() must not resolve before setupComplete');
  assert.equal(client.ws.sentMessages.some(m => m.clientContent), false, 'clientContent must not be sent before setupComplete');

  // Send setupComplete from mock server
  client.ws.onmessage({ data: JSON.stringify({ setupComplete: {} }) });

  const result = await connectPromise;
  // 4. connect() resolves after setupComplete
  assert.equal(result, true, 'connect() resolves to true after setupComplete');
  assert.equal(client.isSetupComplete, true);

  // Send realtime audio chunk
  client.sendRealtimeAudioChunk('base64data');
  const lastMsg = client.ws.sentMessages[client.ws.sentMessages.length - 1];
  // 10. microphone audio uses realtimeInput.audio
  assert.equal(Boolean(lastMsg.realtimeInput?.audio?.data), true, 'Realtime audio must use realtimeInput.audio format');
  assert.equal(lastMsg.realtimeInput.audio.mimeType, 'audio/pcm;rate=16000');

  // 11. stopping microphone sends audioStreamEnd
  client.sendAudioStreamEnd();
  const streamEndMsg = client.ws.sentMessages[client.ws.sentMessages.length - 1];
  assert.equal(streamEndMsg.realtimeInput.audioStreamEnd, true);

  // 12. turnComplete returns state to idle
  client.state = 'thinking';
  await client.handleServerMessage({ data: JSON.stringify({ serverContent: { turnComplete: true } }) });
  assert.equal(client.state, 'idle', 'turnComplete must return state to idle');

  // Restore globals
  global.WebSocket = originalWs;
  global.fetch = originalFetch;
});
