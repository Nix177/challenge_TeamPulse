/**
 * Vercel Serverless Function: Ephemeral Token Provider for Gemini Live WebSockets
 * 
 * Securely requests a short-lived, single-use auth token from Google Gemini API
 * using the official /v1beta/auth_tokens endpoint.
 * The permanent GOOGLE_API_KEY remains strictly server-side and is NEVER returned.
 */

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;

function cleanupRateLimit() {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.startTime > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}

function checkRateLimit(ip) {
  cleanupRateLimit();
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return true;
  }
  if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return true;
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  record.count += 1;
  return true;
}

export default async function handler(req, res) {
  // Set anti-caching headers immediately
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Handle CORS OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  // Rate Limiting
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ ok: false, error: 'Too Many Requests' });
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ 
      ok: false, 
      error: 'GOOGLE_API_KEY environment variable is not configured on server.' 
    });
  }

  const model = process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview';
  const voice = process.env.GEMINI_LIVE_VOICE || 'Sadaltager';

  const nowMs = Date.now();
  const expireTimeStr = new Date(nowMs + 30 * 60 * 1000).toISOString();
  const newSessionExpireTimeStr = new Date(nowMs + 60 * 1000).toISOString();

  try {
    const googleRes = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        uses: 1,
        expireTime: expireTimeStr,
        newSessionExpireTime: newSessionExpireTimeStr
      })
    });

    if (!googleRes.ok) {
      return res.status(502).json({
        ok: false,
        error: 'Upstream token creation failed'
      });
    }

    const data = await googleRes.json();
    const ephemeralToken = data.token?.name || data.name;

    if (!ephemeralToken) {
      return res.status(502).json({
        ok: false,
        error: 'Missing token in upstream response'
      });
    }

    return res.status(200).json({
      ok: true,
      token: ephemeralToken,
      model: model,
      voice: voice,
      expiresAt: new Date(expireTimeStr).getTime()
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: 'Upstream connection error'
    });
  }
}
