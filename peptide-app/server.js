// Development / pilot server.
// - Serves the app with the cross-origin isolation headers Shen.AI's fast (threaded) runtime needs.
// - Serves the Shen.AI Web SDK from node_modules at /vendor/shenai-sdk/ (the SDK is proprietary
//   and is never committed to this repo; install it with `npm run shen:install`).
// - /api/shen-token gives the browser a licence credential for the SDK.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const SHEN_DIR = join(ROOT, 'node_modules', '@shenai', 'sdk');
const PORT = Number(process.env.PORT) || 4173;
const SHEN_API_KEY = process.env.SHEN_API_KEY || '';
// Dev-only: hand the raw licence key to the browser. Never enable this on a public server.
const KEY_PASSTHROUGH = process.env.SHEN_KEY_PASSTHROUGH === '1';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm',
};
const SECURITY = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(self)',
};

function send(res, status, body, type = 'application/json', extra = {}) {
  res.writeHead(status, { ...SECURITY, 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function shenToken(req, res) {
  if (!SHEN_API_KEY) return send(res, 503, { error: 'SHEN_API_KEY is not set on the server' });
  if (req.method === 'HEAD' || req.method === 'GET') return send(res, 200, { ok: true });
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (KEY_PASSTHROUGH) return send(res, 200, { token: SHEN_API_KEY });
  // Production: mint a short-lived Shen.AI token here using SHEN_API_KEY, following
  // developer.shen.ai/getting-started/authorization (endpoint not reachable from the build
  // environment, so it is deliberately not guessed). Until then, refuse rather than leak the key.
  return send(res, 501, { error: 'Token minting not configured. For local testing set SHEN_KEY_PASSTHROUGH=1.' });
}

async function serveFile(res, file, cacheable) {
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error('not a file');
    const body = await readFile(file);
    res.writeHead(200, {
      ...SECURITY,
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Cache-Control': cacheable ? 'public, max-age=2592000, immutable' : 'no-cache',
    });
    res.end(body);
  } catch {
    send(res, 404, 'Not found', 'text/plain');
  }
}

http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (urlPath === '/api/shen-token') return shenToken(req, res);

  if (urlPath.startsWith('/vendor/shenai-sdk/')) {
    const file = normalize(join(SHEN_DIR, urlPath.slice('/vendor/shenai-sdk/'.length)));
    if (!file.startsWith(SHEN_DIR + sep)) return send(res, 404, 'Not found', 'text/plain');
    return serveFile(res, file, true); // ~35–40 MB of wasm: let phones cache it for a month
  }

  const rel = normalize(urlPath === '/' ? '/index.html' : urlPath);
  if (/^[/\\](tests|docs|node_modules|scripts)([/\\]|$)/.test(rel) || rel.includes('..')) return send(res, 404, 'Not found', 'text/plain');
  return serveFile(res, join(ROOT, rel), false);
}).listen(PORT, () => {
  console.log(`PeptiSafe running at http://localhost:${PORT}`);
  console.log(SHEN_API_KEY ? `Shen.AI: key set${KEY_PASSTHROUGH ? ' (DEV passthrough)' : ''}` : 'Shen.AI: no SHEN_API_KEY, face scan runs in demo mode');
});
