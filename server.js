// Zero-dependency static server for local preview and simple VPS hosting.
//   node server.js            → http://localhost:8080
// Mirrors what a proper host does: 301 to trailing slash, real 404 status with 404.html,
// 405 for non-GET, gzip, caching and security headers.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC = /^\/(index\.html|404\.html|privacy\/|css\/|js\/|fonts\/|assets\/(img|video)\/|[\w.-]+\.(png|ico|svg|jpg|txt|xml|webmanifest)$)/;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4',
};
const HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
const cache = (p) =>
  p.startsWith('/fonts/') ? 'public, max-age=31536000, immutable'
  : p.startsWith('/assets/') || /\.(png|ico|svg|jpg)$/.test(p) ? 'public, max-age=2592000'
  : /\.(css|js)$/.test(p) ? 'public, max-age=86400'
  : 'public, max-age=0, must-revalidate';

async function isFile(p) {
  try { return (await stat(p)).isFile(); } catch { return false; }
}
async function isDir(p) {
  try { return (await stat(p)).isDirectory(); } catch { return false; }
}

function send(req, res, status, headers, body) {
  const text = /^(text|application\/(xml|manifest)|image\/svg)/.test(headers['Content-Type'] || '');
  if (body && text && body.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    body = gzipSync(body);
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
  }
  if (body) headers['Content-Length'] = body.length;
  res.writeHead(status, { ...HEADERS, ...headers });
  res.end(req.method === 'HEAD' ? undefined : body);
}

async function notFound(req, res) {
  const body = await readFile(join(ROOT, '404.html'));
  send(req, res, 404, { 'Content-Type': TYPES['.html'], 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-cache' }, body);
}

createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, { Allow: 'GET, HEAD', 'Content-Type': TYPES['.txt'] }, Buffer.from('Method Not Allowed'));
    let path;
    try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return notFound(req, res); }

    if (path === '/index.html') return send(req, res, 301, { Location: '/' }, null);
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT.replace(/[\\/]$/, '') + sep) && file + sep !== ROOT) return notFound(req, res);

    if (path !== '/' && (await isDir(file))) {
      if (!path.endsWith('/')) return send(req, res, 301, { Location: path + '/' }, null);
      if (!PUBLIC.test(path) || !(await isFile(join(file, 'index.html')))) return notFound(req, res);
      return send(req, res, 200, { 'Content-Type': TYPES['.html'], 'Cache-Control': cache(path) }, await readFile(join(file, 'index.html')));
    }
    if (path === '/') return send(req, res, 200, { 'Content-Type': TYPES['.html'], 'Cache-Control': cache(path) }, await readFile(join(ROOT, 'index.html')));
    if (!PUBLIC.test(path) || !(await isFile(file))) return notFound(req, res);
    // Byte ranges for video: Safari/iOS will not play mp4 without them.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range && extname(file) === '.mp4') {
      const buf = await readFile(file);
      const start = range[1] ? Number(range[1]) : Math.max(0, buf.length - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), buf.length - 1) : buf.length - 1;
      if (start > end || start >= buf.length) return send(req, res, 416, { 'Content-Range': `bytes */${buf.length}` }, null);
      return send(req, res, 206, { 'Content-Type': TYPES['.mp4'], 'Content-Range': `bytes ${start}-${end}/${buf.length}`, 'Accept-Ranges': 'bytes', 'Cache-Control': cache(path) }, buf.subarray(start, end + 1));
    }
    send(req, res, 200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': cache(path) }, await readFile(file));
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(req, res, 500, { 'Content-Type': TYPES['.txt'] }, Buffer.from('Server error'));
  }
}).listen(PORT, HOST, () => console.log(`Senimen site on http://localhost:${PORT}`));
