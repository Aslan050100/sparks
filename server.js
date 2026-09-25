// Zero-dependency production server: static files from dist/ + POST /api/lead.
//
//   PORT=8080 node server.js
//
// Env:
//   PORT, HOST                 listen address (default 0.0.0.0:8080)
//   TELEGRAM_BOT_TOKEN,
//   TELEGRAM_CHAT_ID           forward every lead to a Telegram chat (optional)
//   LEADS_FILE                 where leads are appended as JSON lines (default data/leads.jsonl)
//   HSTS=on                    send Strict-Transport-Security (only behind HTTPS)
import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const LEADS_FILE = process.env.LEADS_FILE || join(ROOT, 'data', 'leads.jsonl');

const meta = JSON.parse(await readFile(join(DIST, '_meta.json'), 'utf8'));
const LANGS = meta.languages;
const NOINDEX = new Set(meta.noindex);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
  ...(process.env.HSTS === 'on' ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
};

function cacheControl(path) {
  if (path.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (/^\/(img|fonts|og)\//.test(path) || /\.(png|ico|svg)$/.test(path)) return 'public, max-age=2592000';
  if (/\.(xml|txt|webmanifest)$/.test(path)) return 'public, max-age=3600';
  return 'public, max-age=0, must-revalidate';
}

const langOf = (path) => (LANGS.includes(path.split('/')[1]) ? path.split('/')[1] : meta.defaultLang);

function pickLang(req) {
  const cookie = /(?:^|;\s*)lang=(\w+)/.exec(req.headers.cookie || '')?.[1];
  if (LANGS.includes(cookie)) return cookie;
  const accepted = (req.headers['accept-language'] || '')
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { lang: tag.toLowerCase().slice(0, 2), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return accepted.find((a) => LANGS.includes(a.lang))?.lang || meta.defaultLang;
}

function send(res, status, headers, body, method) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(method === 'HEAD' ? undefined : body);
}

async function fileInfo(path) {
  try {
    const s = await stat(path);
    return s.isFile() ? s : s.isDirectory() ? 'dir' : null;
  } catch {
    return null;
  }
}

async function serveFile(req, res, urlPath, filePath, status = 200) {
  const ext = extname(filePath);
  const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cacheControl(urlPath) };
  const isNoindex = status === 404 || NOINDEX.has(urlPath) || !meta.indexing;
  if (ext === '.html' && isNoindex) headers['X-Robots-Tag'] = 'noindex';
  if (ext === '.html') headers['Content-Language'] = langOf(urlPath);

  // Serve a pre-compressed variant when the client accepts it.
  const accept = req.headers['accept-encoding'] || '';
  let body;
  for (const [enc, suffix] of [['br', '.br'], ['gzip', '.gz']]) {
    if (accept.includes(enc)) {
      try {
        body = await readFile(filePath + suffix);
        headers['Content-Encoding'] = enc;
        break;
      } catch {}
    }
  }
  body ??= await readFile(filePath);
  if (TYPES[ext]?.includes('charset') || ext === '.svg') headers.Vary = 'Accept-Encoding';

  const etag = `"${createHash('sha1').update(body).digest('base64url').slice(0, 20)}"`;
  headers.ETag = etag;
  headers['Content-Length'] = body.length;
  if (status === 200 && req.headers['if-none-match'] === etag) {
    delete headers['Content-Length'];
    return send(res, 304, headers, null, 'HEAD');
  }
  send(res, status, headers, body, req.method);
}

async function notFound(req, res, urlPath) {
  const lang = langOf(urlPath);
  await serveFile(req, res, urlPath, join(DIST, lang, '404.html'), 404);
}

// ---------- Lead form ----------

const recent = new Map(); // ip -> timestamps, basic rate limit
function rateLimited(ip) {
  const now = Date.now();
  const list = (recent.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  recent.set(ip, list);
  return list.length > 5;
}

function readBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const cleanText = (v, max) => String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max);

function validate(raw) {
  const lead = {
    name: clean(raw.name, 100),
    phone: clean(raw.phone, 30),
    type: clean(raw.type, 30),
    date: clean(raw.date, 10),
    guests: clean(raw.guests, 6),
    message: cleanText(raw.message, 2000),
    lang: LANGS.includes(raw.lang) ? raw.lang : meta.defaultLang,
    page: clean(raw.page, 200),
  };
  const digits = lead.phone.replace(/\D/g, '');
  const ok = lead.name.length >= 2 && digits.length >= 10 && digits.length <= 15 && /^[0-9+()\-\s]+$/.test(lead.phone) && (raw.consent === '1' || raw.consent === true || raw.consent === 'on');
  return ok ? lead : null;
}

async function notifyTelegram(lead) {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!token || !chat) return;
  const text = [
    '✨ Новая заявка — Sparks',
    `Имя: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    lead.type && `Формат: ${lead.type}`,
    lead.date && `Дата: ${lead.date}`,
    lead.guests && `Гостей: ${lead.guests}`,
    lead.message && `Комментарий: ${lead.message}`,
    `Язык: ${lead.lang} · ${lead.page || '/'}`,
  ].filter(Boolean).join('\n');
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Telegram ${r.status}`);
}

async function handleLead(req, res) {
  const wantsJson = (req.headers.accept || '').includes('application/json');
  const reply = (status, payload, lang) => {
    if (wantsJson) return send(res, status, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' }, JSON.stringify(payload), 'POST');
    if (status === 200) return send(res, 303, { Location: `/${lang}/thanks/`, 'Cache-Control': 'no-store' }, '', 'POST');
    send(res, status, { 'Content-Type': TYPES['.txt'], 'Cache-Control': 'no-store' }, payload.error, 'POST');
  };

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
  if (rateLimited(ip)) return reply(429, { ok: false, error: 'Too many requests' });

  let raw;
  try {
    const body = await readBody(req);
    const type = req.headers['content-type'] || '';
    raw = type.includes('application/json') ? JSON.parse(body) : Object.fromEntries(new URLSearchParams(body));
  } catch (e) {
    return reply(e.status || 400, { ok: false, error: 'Bad request' });
  }
  const lang = LANGS.includes(raw.lang) ? raw.lang : meta.defaultLang;

  // Honeypot filled → pretend success, store nothing.
  if (raw.website) return reply(200, { ok: true }, lang);

  const lead = validate(raw);
  if (!lead) return reply(422, { ok: false, error: 'Invalid form data' }, lang);

  const record = { ...lead, at: new Date().toISOString(), ip, ua: clean(req.headers['user-agent'], 200) };
  try {
    await mkdir(dirname(LEADS_FILE), { recursive: true });
    await appendFile(LEADS_FILE, JSON.stringify(record) + '\n');
  } catch (e) {
    console.error('lead: failed to store', e);
    return reply(500, { ok: false, error: 'Server error' }, lang);
  }
  notifyTelegram(lead).catch((e) => console.error('lead: telegram failed', e.message));
  console.log(`lead: ${lead.name} ${lead.phone} (${lead.lang})`);
  reply(200, { ok: true }, lang);
}

// ---------- Router ----------

async function handle(req, res) {
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    return send(res, 400, { 'Content-Type': TYPES['.txt'] }, 'Bad request', req.method);
  }
  let path;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    return notFound(req, res, '/');
  }

  if (path === '/api/lead') {
    if (req.method !== 'POST') return send(res, 405, { Allow: 'POST', 'Content-Type': TYPES['.txt'] }, 'Method Not Allowed', req.method);
    return handleLead(req, res);
  }
  if (path.startsWith('/api/')) return send(res, 404, { 'Content-Type': TYPES['.json'] }, '{"ok":false}', req.method);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, { Allow: 'GET, HEAD', 'Content-Type': TYPES['.txt'] }, 'Method Not Allowed', req.method);
  }

  // Root: language redirector (x-default). 302 because the target depends on the visitor.
  if (path === '/') {
    return send(res, 302, { Location: `/${pickLang(req)}/`, Vary: 'Accept-Language, Cookie', 'Cache-Control': 'no-store' }, '', req.method);
  }

  // Canonical URL rules → 301: no index.html, no double slashes, lowercase.
  let canonical = path.replace(/\/{2,}/g, '/').replace(/\/index\.html$/, '/');
  if (/[A-Z]/.test(canonical) && !/\.\w+$/.test(canonical)) canonical = canonical.toLowerCase();
  if (canonical !== path) return send(res, 301, { Location: canonical + url.search, 'Cache-Control': 'public, max-age=3600' }, '', req.method);

  const filePath = normalize(join(DIST, path));
  if (!filePath.startsWith(DIST + sep) || /(^|\/)[._]/.test(path.slice(1)) || /\.(br|gz)$/.test(path) || path.endsWith('/404.html')) return notFound(req, res, path);

  const info = await fileInfo(filePath);
  if (info === 'dir') {
    if (!path.endsWith('/')) return send(res, 301, { Location: `${path}/${url.search}`, 'Cache-Control': 'public, max-age=3600' }, '', req.method);
    const index = join(filePath, 'index.html');
    if (await fileInfo(index)) return serveFile(req, res, path, index);
    return notFound(req, res, path);
  }
  if (info) return serveFile(req, res, path, filePath);
  return notFound(req, res, path);
}

const server = createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) send(res, 500, { 'Content-Type': TYPES['.txt'] }, 'Internal Server Error', req.method);
  });
});

server.listen(PORT, HOST, () => console.log(`Sparks site on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`));

export default server;
