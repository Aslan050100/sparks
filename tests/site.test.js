// SEO, HTTP and crawler checks against the site served by server.js.  Run: npm test
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { after, before, describe, test } from 'node:test';

const SITE = 'https://senimenagency.kz';
const PORT = 18500 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}`;
let server;

before(async () => {
  server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`${BASE}/robots.txt`); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('server did not start');
});
after(() => server.kill());

const get = (path, headers = {}) => fetch(BASE + path, { redirect: 'manual', headers });
const text = async (path, headers) => (await get(path, headers)).text();
const attr = (html, re) => (html.match(re) || [])[1];
const sitemapPaths = async () => [...(await text('/sitemap.xml')).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

describe('HTTP status codes', () => {
  for (const [path, status] of [
    ['/', 200], ['/privacy/', 200], ['/privacy', 301], ['/index.html', 301],
    ['/missing-page/', 404], ['/assets/', 404], ['/server.js', 404], ['/assets-src/images.json', 404], ['/.git/config', 404],
    ['/robots.txt', 200], ['/sitemap.xml', 200], ['/llms.txt', 200], ['/og-image.jpg', 200], ['/site.webmanifest', 200],
  ]) {
    test(`${path} → ${status}`, async () => assert.equal((await get(path)).status, status));
  }
  test('404 page is noindex', async () => {
    const r = await get('/nothing');
    assert.equal(r.headers.get('x-robots-tag'), 'noindex');
    assert.match(await r.text(), /<meta name="robots" content="noindex/);
  });
  test('POST → 405', async () => assert.equal((await fetch(BASE + '/', { method: 'POST' })).status, 405));
  test('video supports byte ranges (Safari/iOS)', async () => assert.equal((await get('/assets/video/backstage.mp4', { Range: 'bytes=0-99' })).status, 206));
});

describe('robots.txt and crawler access', () => {
  test('everything allowed, sitemap referenced', async () => {
    const robots = await text('/robots.txt');
    assert.match(robots, /User-agent: \*\nAllow: \//);
    assert.doesNotMatch(robots, /Disallow: \/\s*$/m);
    assert.match(robots, new RegExp(`Sitemap: ${SITE}/sitemap.xml`));
  });
  test('OAI-SearchBot is explicitly allowed', async () => {
    const group = (await text('/robots.txt')).split('\n\n').find((g) => g.includes('User-agent: OAI-SearchBot'));
    assert.ok(group);
    assert.match(group, /Allow: \//);
  });
  const bots = {
    'OAI-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
    'ChatGPT-User': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
    GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.1; +https://openai.com/gptbot)',
    Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    YandexBot: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
    Bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    PerplexityBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  };
  for (const [name, ua] of Object.entries(bots)) {
    test(`${name} gets full HTML content on every sitemap URL`, async () => {
      for (const path of await sitemapPaths()) {
        const r = await get(path, { 'User-Agent': ua });
        assert.equal(r.status, 200, path);
        const html = await r.text();
        assert.ok(!r.headers.get('x-robots-tag'), path);
        assert.match(html, /<h1[^>]*>[^<]+/, path);
        assert.match(html, /<meta name="robots" content="index, follow/, path);
      }
    });
  }
});

describe('page SEO', () => {
  test('sitemap lists only indexable pages', async () => {
    assert.deepEqual(await sitemapPaths(), ['/', '/privacy/']);
  });

  test('canonical, title, description, Open Graph, schema.org on every page', async () => {
    for (const path of await sitemapPaths()) {
      const html = await text(path);
      assert.equal(attr(html, /<link rel="canonical" href="([^"]+)"/), SITE + path, path);
      const title = attr(html, /<title>([^<]+)<\/title>/);
      const desc = attr(html, /<meta name="description" content="([^"]+)"/);
      assert.ok(title.length >= 30 && title.length <= 70, `title ${title.length} ${path}`);
      assert.ok(desc.length >= 70 && desc.length <= 170, `description ${desc.length} ${path}`);
      assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `one h1 ${path}`);
      assert.match(html, /<html lang="ru">/);
      assert.match(html, /name="viewport" content="width=device-width, initial-scale=1/);
      for (const p of ['og:type', 'og:site_name', 'og:locale', 'og:url', 'og:title', 'og:description', 'og:image']) {
        assert.match(html, new RegExp(`property="${p}" content="[^"]+"`), `${p} ${path}`);
      }
      assert.equal(attr(html, /property="og:url" content="([^"]+)"/), SITE + path);
      assert.match(attr(html, /property="og:image" content="([^"]+)"/), /^https:\/\//);
      const ld = JSON.parse(attr(html, /<script type="application\/ld\+json">([\s\S]+?)<\/script>/));
      assert.ok(ld['@context'] === 'https://schema.org');
    }
    const ld = JSON.parse(attr(await text('/'), /<script type="application\/ld\+json">([\s\S]+?)<\/script>/));
    const types = ld['@graph'].flatMap((n) => [].concat(n['@type']));
    for (const t of ['Organization', 'WebSite', 'WebPage', 'FAQPage']) assert.ok(types.includes(t), t);
  });

  test('images have alt and intrinsic size; hero is high priority, the rest lazy', async () => {
    const html = await text('/');
    const imgs = html.match(/<img [^>]+>/g);
    assert.ok(imgs.length >= 8);
    for (const img of imgs) {
      assert.match(img, /alt="[^"]+"/, img);
      assert.match(img, /width="\d+" height="\d+"/, img);
    }
    assert.equal(imgs.filter((i) => i.includes('fetchpriority="high"')).length, 1);
    assert.equal(imgs.filter((i) => i.includes('loading="lazy"')).length, imgs.length - 1);
  });

  test('every local file referenced by the pages exists (no broken links or assets)', async () => {
    for (const [page, base] of [['index.html', ''], ['privacy/index.html', 'privacy/'], ['404.html', '']]) {
      const html = readFileSync(page, 'utf8');
      const refs = [
        ...[...html.matchAll(/(?:href|src|poster|data-src)="([^"#:]+)"/g)].map((m) => m[1]),
        ...[...html.matchAll(/srcset="([^"]+)"/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(' ')[0])),
      ].filter((r) => r && !r.startsWith('mailto') && !r.startsWith('tel'));
      for (const ref of refs) {
        const file = ref.startsWith('/') ? ref.slice(1) : new URL(ref, `file:///${base}`).pathname.slice(1);
        const target = file === '' || file.endsWith('/') ? `${file}index.html` : file;
        assert.ok(existsSync(target), `${page}: ${ref}`);
      }
    }
  });

  test('anchor links point to existing sections', async () => {
    const html = readFileSync('index.html', 'utf8');
    for (const [, id] of html.matchAll(/href="#([\w-]+)"/g)) assert.match(html, new RegExp(`id="${id}"`), id);
  });

  test('no leftovers from the old brand or phone', async () => {
    for (const f of ['index.html', 'privacy/index.html', '404.html', 'js/main.js', 'llms.txt', 'site.webmanifest', 'robots.txt']) {
      const s = readFileSync(f, 'utf8');
      assert.doesNotMatch(s, /SPARKS|Sparks |sparks-agency|77719894131|771 989/, f);
    }
  });
});

describe('performance hygiene', () => {
  test('text is compressed and static assets are cacheable', async () => {
    assert.equal((await get('/', { 'Accept-Encoding': 'gzip' })).headers.get('content-encoding'), 'gzip');
    assert.match((await get('/fonts/DrukWideCyr-Bold.woff2')).headers.get('cache-control'), /max-age=31536000/);
    assert.match((await get('/assets/img/dj-800.webp')).headers.get('cache-control'), /max-age=2592000/);
  });
  test('no third-party requests in the critical path', async () => {
    const html = await text('/');
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/);
    assert.match(html, /<script src="js\/main\.js" defer>/);
  });
});
