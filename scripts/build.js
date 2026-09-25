// Static site generator: renders every page for every language into dist/.
// Usage: SITE_URL=https://sparks-agency.kz node scripts/build.js
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

import config from '../src/config.js';
import en from '../src/content/en.js';
import kk from '../src/content/kk.js';
import ru from '../src/content/ru.js';
import { abs, paths } from '../src/templates/helpers.js';
import { layout, swapLang } from '../src/templates/layout.js';
import { homePage, notFoundPage, privacyPage, servicePage, thanksPage } from '../src/templates/pages.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const content = { ru, kk, en };
const lastmod = process.env.LASTMOD || new Date().toISOString().slice(0, 10);

function write(rel, data) {
  const file = join(DIST, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

// Check that every language defines the same keys, so no page silently misses a translation.
function checkTranslations() {
  const shape = (o, p = '') =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? shape(v, `${p}${k}.`) : [`${p}${k}`]));
  const base = new Set(shape(ru));
  for (const [lang, t] of Object.entries(content)) {
    const keys = new Set(shape(t));
    const missing = [...base].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !base.has(k));
    if (missing.length || extra.length) throw new Error(`Translation mismatch in ${lang}: missing ${missing} extra ${extra}`);
  }
}

function build() {
  checkTranslations();
  rmSync(DIST, { recursive: true, force: true });
  cpSync(join(ROOT, 'src/static'), DIST, { recursive: true });

  const css = minifyCss(readFileSync(join(ROOT, 'src/styles/main.css'), 'utf8'));
  const js = readFileSync(join(ROOT, 'src/scripts/main.js'), 'utf8');
  const jsName = `/assets/main.${createHash('sha256').update(js).digest('hex').slice(0, 10)}.js`;
  write(jsName, js);
  const assets = { css, js: jsName };

  const indexable = []; // paths that go into the sitemap
  const noindex = [];

  for (const lang of config.languages) {
    const t = content[lang];
    const pages = [
      homePage(lang, t),
      ...Object.keys(t.services).map((slug) => servicePage(lang, t, slug)),
      privacyPage(lang, t),
      thanksPage(lang, t),
      notFoundPage(lang, t),
    ];
    for (const { page, body } of pages) {
      const out = page.path.endsWith('/') ? `${page.path}index.html` : page.path;
      write(out, layout({ lang, t, page, assets, body }));
      if (page.noindex) noindex.push(page.path);
      else if (lang === config.defaultLang) indexable.push(page.path);
    }
  }

  // sitemap.xml with hreflang alternates for every language version.
  const urls = indexable.flatMap((p) =>
    config.languages.map((lang) => {
      const loc = abs(swapLang(p, lang));
      const alts = config.languages
        .map((l) => `    <xhtml:link rel="alternate" hreflang="${config.htmlLang[l]}" href="${abs(swapLang(p, l))}"/>`)
        .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(p === paths.home(config.defaultLang) ? '/' : p)}"/>`)
        .join('\n');
      const priority = p === paths.home(config.defaultLang) ? '1.0' : p.includes('/services/') ? '0.8' : '0.3';
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n${alts}\n  </url>`;
    }),
  );
  write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
  );

  // robots.txt: everything open except the form endpoint; AI/search crawlers listed explicitly.
  const bots = ['Googlebot', 'Bingbot', 'YandexBot', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'ClaudeBot', 'Claude-SearchBot', 'Applebot'];
  const robots = config.indexing
    ? [
        '# Sparks Event Agency',
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        '',
        '# Search engines and AI search crawlers are explicitly welcome',
        ...bots.map((b) => `User-agent: ${b}`),
        'Allow: /',
        'Disallow: /api/',
        '',
        `Sitemap: ${abs('/sitemap.xml')}`,
        '',
      ].join('\n')
    : 'User-agent: *\nDisallow: /\n';
  write('robots.txt', robots);

  write(
    'site.webmanifest',
    JSON.stringify(
      {
        name: config.legalName,
        short_name: config.brand,
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0908',
        theme_color: '#0b0908',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      null,
      2,
    ),
  );

  // llms.txt: a plain summary for AI assistants (https://llmstxt.org).
  write(
    'llms.txt',
    [
      `# ${config.legalName}`,
      '',
      `> ${en.home.description}`,
      '',
      `Contact: ${config.phoneDisplay} (phone, WhatsApp) · ${config.email} · Telegram ${config.telegram} · Instagram ${config.instagram}`,
      '',
      '## Services',
      ...Object.entries(en.services).map(([slug, s]) => `- [${s.name}](${abs(paths.service('en', slug))}): ${s.short}`),
      '',
      '## New Year packages',
      ...en.packages.names.map((n, i) => `- ${n}: ${en.packages.prices[i].toLocaleString('en-US')} KZT`),
      '',
      '## Languages',
      ...config.languages.map((l) => `- ${config.langNames[l]}: ${abs(paths.home(l))}`),
      '',
    ].join('\n'),
  );

  write('_meta.json', JSON.stringify({ noindex, indexing: config.indexing, languages: config.languages, defaultLang: config.defaultLang }, null, 2));

  // Pre-compress text assets so the server can send them without runtime cost.
  let count = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const file = join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (/\.(html|css|js|xml|txt|svg|json|webmanifest)$/.test(name)) {
        const buf = readFileSync(file);
        if (buf.length < 512) continue;
        writeFileSync(`${file}.br`, brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }));
        writeFileSync(`${file}.gz`, gzipSync(buf, { level: 9 }));
        count++;
      }
    }
  };
  walk(DIST);

  console.log(`Built ${indexable.length * config.languages.length} indexable pages (+${noindex.length} noindex) for ${config.siteUrl}; compressed ${count} files.`);
  if (!config.indexing) console.log('INDEXING=off: all pages are noindex and robots.txt disallows crawling.');
}

build();
