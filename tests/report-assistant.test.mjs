import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { 
  TeamPulseReportRetriever, 
  normalizeFrenchText, 
  extractTokens 
} from '../public/js/TeamPulseReportRetriever.js';
import { SYSTEM_INSTRUCTION } from '../public/js/GeminiLiveClient.js';
import { PcmAudioPlayer } from '../public/js/PcmAudioPlayer.js';

test('RAG JSON loads successfully and JSONL conversion retains all 49 chunk IDs and content', async () => {
  const jsonPath = path.resolve(process.cwd(), 'public/data/team-pulse-rag.json');
  const jsonlPath = path.resolve(process.cwd(), '_inputs/Team_Pulse_RAG_chunks.jsonl');

  assert.equal(fs.existsSync(jsonPath), true, 'public/data/team-pulse-rag.json must exist');
  assert.equal(fs.existsSync(jsonlPath), true, '_inputs/Team_Pulse_RAG_chunks.jsonl must exist');

  const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const jsonlLines = fs.readFileSync(jsonlPath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  assert.equal(Array.isArray(jsonContent), true);
  assert.equal(jsonContent.length, jsonlLines.length, 'JSON array length must match JSONL line count');
  assert.equal(jsonContent.length, 49, 'Corpus must contain 49 chunks');

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

test('SYSTEM_INSTRUCTION contains strict grounding rules and forbids invented client feedback', () => {
  assert.equal(SYSTEM_INSTRUCTION.includes('Nicolas Tuor'), true);
  assert.equal(SYSTEM_INSTRUCTION.includes('troisième personne'), true);
  assert.equal(SYSTEM_INSTRUCTION.includes('N\'inventez JAMAIS de retours clients'), true);
  assert.equal(SYSTEM_INSTRUCTION.includes('maquette de démonstration'), true);
  assert.equal(SYSTEM_INSTRUCTION.includes('vibe coding'), true);
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

test('Avatar manifest and placeholder SVG exist and parse correctly under public assets', () => {
  const manifestPath = path.resolve(process.cwd(), 'public/assets/report-assistant/avatar-manifest.json');
  const svgPath = path.resolve(process.cwd(), 'public/assets/report-assistant/placeholder-avatar.svg');

  assert.equal(fs.existsSync(manifestPath), true, 'avatar-manifest.json must exist');
  assert.equal(fs.existsSync(svgPath), true, 'placeholder-avatar.svg must exist');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(typeof manifest.fps, 'number');
  assert.equal(Array.isArray(manifest.speaking), true);
});
