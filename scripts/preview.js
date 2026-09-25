// Offline preview: turns dist/ into files that open straight from disk (file://), no server needed.
//   npm run preview
// Produces:
//   preview/site/          the whole site with relative links — open preview/site/ru/index.html
//   preview/sparks-ru.html a single self-contained page (fonts, images, JS inlined)
// The lead form cannot submit offline; everything else works.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'preview');
const SITE = join(OUT, 'site');

if (!existsSync(join(DIST, '_meta.json'))) throw new Error('Run "npm run build" first');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(DIST, SITE, { recursive: true, filter: (src) => !/\.(br|gz)$/.test(src) && !src.endsWith('_meta.json') });

const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));

// Root-absolute URL → path relative to the page; directory URLs get index.html (file:// has no directory index).
function relativize(html, file) {
  const depth = relative(SITE, dirname(file)).split(sep).filter(Boolean).length;
  const prefix = '../'.repeat(depth) || './';
  const fix = (url) => {
    const [path, hash = ''] = url.split('#');
    const target = path.endsWith('/') || path === '' ? `${path}index.html` : path;
    return prefix + target.replace(/^\//, '') + (hash ? `#${hash}` : '');
  };
  return html
    .replace(/(href|src)="(\/[^"]*)"/g, (_, attr, url) => `${attr}="${fix(url)}"`)
    .replace(/srcset="([^"]+)"/g, (_, set) => `srcset="${set.replace(/(^|, )\//g, `$1${prefix}`)}"`)
    .replace(/url\('\/(fonts\/[^']+)'\)/g, `url('${prefix}$1')`)
    .replace(/<link rel="preload"[^>]+>\n?/g, ''); // crossorigin preloads are blocked on file://
}

for (const file of walk(SITE).filter((f) => f.endsWith('.html'))) {
  writeFileSync(file, relativize(readFileSync(file, 'utf8'), file));
}
// Entry point at the top of the folder.
writeFileSync(join(SITE, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=ru/index.html"><a href="ru/index.html">Sparks</a>\n');

// Single self-contained file of the Russian home page.
const pagePath = join(SITE, 'ru', 'index.html');
const dataUri = (rel, type) => `data:${type};base64,${readFileSync(join(SITE, 'ru', rel)).toString('base64')}`;
let single = readFileSync(pagePath, 'utf8')
  .replace(/url\('(\.\.\/fonts\/[^']+)'\)/g, (_, rel) => `url('${dataUri(rel, 'font/woff2')}')`)
  .replace(/<source [^>]+>/g, '') // keep only the <img> fallback (largest WebP)
  .replace(/<img src="(\.\.\/img\/[^"]+\.webp)"/g, (_, rel) => `<img src="${dataUri(rel, 'image/webp')}"`)
  .replace(/<img src="(\.\.\/img\/[^"]+\.svg)"/g, (_, rel) => `<img src="${dataUri(rel, 'image/svg+xml')}"`)
  .replace(/<link rel="(icon|apple-touch-icon|manifest)"[^>]*>\n?/g, '');
// Inline JS must run after the markup, so move it to the end of <body>.
const jsRel = single.match(/<script src="(\.\.\/assets\/[^"]+)" defer><\/script>\n?/);
single = single.replace(jsRel[0], '').replace('</body>', `<script>${readFileSync(join(SITE, 'ru', jsRel[1]), 'utf8')}</script>\n</body>`);
writeFileSync(join(OUT, 'sparks-ru.html'), single);

console.log(`Offline site: ${relative(ROOT, join(SITE, 'index.html'))}`);
console.log(`Single page:  ${relative(ROOT, join(OUT, 'sparks-ru.html'))} (${Math.round(Buffer.byteLength(single) / 1024)} KB)`);
