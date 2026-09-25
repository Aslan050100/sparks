// End-to-end checks against the built site served by server.js.
// Run: npm test (builds first).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';

import config from '../src/config.js';

const PORT = 18000 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${PORT}`;
const LEADS = join(mkdtempSync(join(tmpdir(), 'sparks-')), 'leads.jsonl');
let server;

before(async () => {
  server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', LEADS_FILE: LEADS }, stdio: 'pipe' });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${BASE}/robots.txt`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('server did not start');
});
after(() => server.kill());

const get = (path, headers = {}) => fetch(BASE + path, { redirect: 'manual', headers });
const text = async (path, headers) => (await get(path, headers)).text();
const toPath = (url) => new URL(url).pathname;
const attr = (html, re) => (html.match(re) || [])[1];

// All indexable URLs come from the sitemap, so the sitemap itself is under test too.
async function sitemapPaths() {
  const xml = await text('/sitemap.xml');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => toPath(m[1]));
}

describe('HTTP status codes', () => {
  const cases = [
    ['/', 302],
    ['/ru/', 200],
    ['/kk/', 200],
    ['/en/', 200],
    ['/ru', 301],
    ['/ru/index.html', 301],
    ['/EN/', 301],
    ['/en/services/weddings', 301],
    ['/ru/services/weddings/', 200],
    ['/ru/does-not-exist/', 404],
    ['/nothing-here', 404],
    ['/ru/404.html', 404],
    ['/_meta.json', 404],
    ['/ru/index.html.br', 404],
    ['/../server.js', 404],
    ['/robots.txt', 200],
    ['/sitemap.xml', 200],
    ['/llms.txt', 200],
    ['/api/lead', 405],
  ];
  for (const [path, status] of cases) {
    test(`${path} → ${status}`, async () => assert.equal((await get(path)).status, status));
  }

  test('root redirect follows Accept-Language and cookie', async () => {
    assert.equal((await get('/', { 'Accept-Language': 'en-US,en;q=0.9' })).headers.get('location'), '/en/');
    assert.equal((await get('/', { 'Accept-Language': 'kk-KZ,kk;q=0.9,ru;q=0.8' })).headers.get('location'), '/kk/');
    assert.equal((await get('/', { 'Accept-Language': 'de-DE' })).headers.get('location'), '/ru/');
    assert.equal((await get('/', { 'Accept-Language': 'en', Cookie: 'lang=kk' })).headers.get('location'), '/kk/');
  });

  test('POST to a page → 405 with Allow header', async () => {
    const r = await fetch(`${BASE}/ru/`, { method: 'POST' });
    assert.equal(r.status, 405);
    assert.equal(r.headers.get('allow'), 'GET, HEAD');
  });

  test('HEAD works and conditional GET returns 304', async () => {
    const head = await fetch(`${BASE}/ru/`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    const etag = head.headers.get('etag');
    assert.ok(etag);
    assert.equal((await get('/ru/', { 'If-None-Match': etag })).status, 304);
  });

  test('404 page is localized and noindex', async () => {
    const r = await get('/kk/missing/');
    assert.equal(r.headers.get('x-robots-tag'), 'noindex');
    assert.match(await r.text(), /<html lang="kk"/);
  });
});

describe('robots.txt and crawler access', () => {
  test('allows everything except /api/ and references the sitemap', async () => {
    const robots = await text('/robots.txt');
    assert.match(robots, /User-agent: \*\nAllow: \/\nDisallow: \/api\//);
    assert.match(robots, new RegExp(`Sitemap: ${config.siteUrl}/sitemap.xml`));
    assert.doesNotMatch(robots, /Disallow: \/\n/);
  });

  test('OAI-SearchBot is explicitly allowed', async () => {
    const robots = await text('/robots.txt');
    const group = robots.split('\n\n').find((g) => g.includes('User-agent: OAI-SearchBot'));
    assert.ok(group, 'OAI-SearchBot group missing');
    assert.match(group, /Allow: \//);
    assert.doesNotMatch(group, /Disallow: \/\s*$/m);
  });

  const bots = {
    'OAI-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
    Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    Bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    YandexBot: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
    'ChatGPT-User': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  };
  for (const [name, ua] of Object.entries(bots)) {
    test(`${name} gets full server-rendered content on every sitemap URL`, async () => {
      for (const path of await sitemapPaths()) {
        const r = await get(path, { 'User-Agent': ua });
        assert.equal(r.status, 200, path);
        const html = await r.text();
        assert.ok(!r.headers.get('x-robots-tag'), `${path} has X-Robots-Tag`);
        assert.match(html, /<h1[^>]*>[^<]+/, `${path} has no h1 text`);
        assert.match(html, /content="index, follow/, path);
      }
    });
  }
});

describe('sitemap.xml', () => {
  test('lists every language version with hreflang alternates', async () => {
    const xml = await text('/sitemap.xml');
    const paths = await sitemapPaths();
    assert.equal(paths.length, 24);
    for (const lang of config.languages) assert.ok(paths.includes(`/${lang}/`));
    assert.ok(!paths.some((p) => p.includes('/thanks/') || p.includes('404')));
    assert.equal((xml.match(/hreflang="x-default"/g) || []).length, paths.length);
  });
});

describe('page SEO', () => {
  test('every indexable page has correct canonical, hreflang, meta and structured data', async () => {
    const titles = new Set();
    const descriptions = new Set();
    for (const path of await sitemapPaths()) {
      const html = await text(path);
      const lang = path.split('/')[1];
      const where = `(${path})`;

      assert.match(html, new RegExp(`<html lang="${lang}"`), where);
      assert.equal(attr(html, /<link rel="canonical" href="([^"]+)"/), config.siteUrl + path, `canonical ${where}`);
      for (const l of config.languages) {
        assert.equal(attr(html, new RegExp(`hreflang="${l}" href="([^"]+)"`)), config.siteUrl + path.replace(/^\/\w\w\//, `/${l}/`), `hreflang ${l} ${where}`);
      }
      assert.match(html, /hreflang="x-default"/, where);

      const title = attr(html, /<title>([^<]+)<\/title>/);
      const desc = attr(html, /<meta name="description" content="([^"]+)"/);
      assert.ok(title && title.length >= 20 && title.length <= 75, `title length ${title?.length} ${where}`);
      assert.ok(desc && desc.length >= 70 && desc.length <= 200, `description length ${desc?.length} ${where}`);
      assert.ok(!titles.has(title), `duplicate title ${where}`);
      assert.ok(!descriptions.has(desc), `duplicate description ${where}`);
      titles.add(title);
      descriptions.add(desc);

      assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `one h1 ${where}`);
      assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1/, where);

      for (const p of ['og:title', 'og:description', 'og:url', 'og:image', 'og:locale', 'og:type', 'og:site_name']) {
        assert.match(html, new RegExp(`property="${p}" content="[^"]+"`), `${p} ${where}`);
      }
      assert.equal(attr(html, /property="og:url" content="([^"]+)"/), config.siteUrl + path, where);
      assert.match(html, /name="twitter:card" content="summary_large_image"/, where);

      const ld = JSON.parse(attr(html, /<script type="application\/ld\+json">(.+?)<\/script>/s));
      const types = ld['@graph'].flatMap((n) => [].concat(n['@type']));
      for (const t of ['Organization', 'WebSite', 'WebPage']) assert.ok(types.includes(t), `${t} in JSON-LD ${where}`);
      if (path.includes('/services/')) {
        assert.ok(types.includes('Service'), `Service in JSON-LD ${where}`);
        assert.ok(JSON.stringify(ld).includes('BreadcrumbList'), `BreadcrumbList ${where}`);
      }
      if (path === `/${lang}/`) assert.ok(types.includes('FAQPage'), where);

      // Images: alt text and intrinsic size on every <img> (CLS + accessibility).
      for (const img of html.match(/<img [^>]+>/g) || []) {
        assert.match(img, /alt="[^"]+"/, `alt ${img} ${where}`);
        assert.match(img, /width="\d+" height="\d+"/, `size ${img} ${where}`);
      }
    }
  });

  test('internal links all resolve (no broken links, no redirects)', async () => {
    const seen = new Set();
    for (const path of await sitemapPaths()) {
      const html = await text(path);
      for (const [, href] of html.matchAll(/href="(\/[^"#]*)/g)) {
        if (seen.has(href)) continue;
        seen.add(href);
        assert.equal((await get(href)).status, 200, `${href} linked from ${path}`);
      }
    }
    assert.ok(seen.size > 20);
  });

  test('service pages link to each other and to home (internal linking)', async () => {
    const html = await text('/ru/services/weddings/');
    const links = [...html.matchAll(/href="(\/ru\/services\/[^"#]+)"/g)].map((m) => m[1]);
    assert.ok(new Set(links).size >= 5);
    assert.match(html, /href="\/ru\/"/);
  });

  test('thanks page is noindex via meta and header', async () => {
    const r = await get('/ru/thanks/');
    assert.equal(r.headers.get('x-robots-tag'), 'noindex');
    assert.match(await r.text(), /<meta name="robots" content="noindex, follow">/);
  });
});

describe('performance hygiene', () => {
  test('HTML is compressed, assets are cacheable', async () => {
    const r = await get('/ru/', { 'Accept-Encoding': 'br, gzip' });
    assert.equal(r.headers.get('content-encoding'), 'br');
    const html = await r.text();
    const js = attr(html, /<script src="(\/assets\/main\.[0-9a-f]+\.js)" defer>/);
    assert.ok(js, 'hashed deferred JS');
    assert.match((await get(js)).headers.get('cache-control'), /immutable/);
    assert.match((await get('/fonts/rubik-var.woff2')).headers.get('cache-control'), /max-age=2592000/);
    assert.ok(!/<link rel="stylesheet"/.test(html), 'CSS is inlined, no render-blocking stylesheet');
    assert.match(html, /fetchpriority="high"/);
    assert.ok(Buffer.byteLength(html) < 120_000);
  });

  test('security headers are present', async () => {
    const r = await get('/ru/');
    for (const h of ['x-content-type-options', 'referrer-policy', 'content-security-policy', 'x-frame-options']) assert.ok(r.headers.get(h), h);
  });
});

describe('lead form', () => {
  const valid = { name: 'Асель', phone: '+7 706 729 00 32', type: 'corporate', guests: '120', consent: '1', lang: 'ru', message: 'Тест' };

  test('JSON submission is stored', async () => {
    const r = await fetch(`${BASE}/api/lead`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(valid) });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true });
    const stored = readFileSync(LEADS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(stored.at(-1).name, 'Асель');
  });

  test('no-JS form post redirects to the localized thanks page', async () => {
    const r = await fetch(`${BASE}/api/lead`, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...valid, lang: 'kk' }) });
    assert.equal(r.status, 303);
    assert.equal(r.headers.get('location'), '/kk/thanks/');
  });

  test('invalid data is rejected', async () => {
    const r = await fetch(`${BASE}/api/lead`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...valid, consent: '' }) });
    assert.equal(r.status, 422);
    const r2 = await fetch(`${BASE}/api/lead`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...valid, phone: '123' }) });
    assert.equal(r2.status, 422);
  });

  test('every page has the form with required fields and consent', async () => {
    const html = await text('/en/services/business-forums/');
    assert.match(html, /<form class="form" action="\/api\/lead" method="post"/);
    for (const n of ['name', 'phone', 'consent']) assert.match(html, new RegExp(`name="${n}"[^>]*required`));
    assert.match(html, /<option value="forum" selected>/);
  });
});
