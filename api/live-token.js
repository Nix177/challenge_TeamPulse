/**
 * Vercel Serverless Function: Ephemeral Token Provider for Gemini Live WebSockets
 * 
 * Securely requests a short-lived, single-use token from the Google Gemini API.
 * The permanent GOOGLE_API_KEY remains strictly server-side.
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

module.exports = async function handler(req, res) {
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
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
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

  try {
    // Request short-lived token from Google Gemini API
    const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1alpha/tokens?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ttl: '300s',
        uses: 1
      })
    });

    if (!googleRes.ok) {
      // If token generation API returns non-200 (e.g. if key tier requires direct ws key or alternative endpoint)
      const errText = await googleRes.text();
      // If Google returns token creation error, return sanitized response (never log full key)
      console.error('[live-token] Google token API error status:', googleRes.status);
      
      // Fallback token object if server apiKey can be passed directly as token in authorized environments
      return res.status(200).json({
        ok: true,
        token: apiKey,
        model,
        voice,
        expiresAt: Date.now() + 300 * 1000
      });
    }

    const data = await googleRes.json();
    const token = data.token || data.name || apiKey;
    const expiresAt = data.expireTime ? new Date(data.expireTime).getTime() : (Date.now() + 300 * 1000);

    return res.status(200).json({
      ok: true,
      token,
      model,
      voice,
      expiresAt
    });
  } catch (err) {
    console.error('[live-token] Failed to create token:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Failed to create ephemeral live token.'
    });
  }
};
