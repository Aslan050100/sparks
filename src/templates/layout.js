import config from '../config.js';
import { abs, esc, html, icon, mark, paths } from './helpers.js';

// Replace the lang prefix of a path: /ru/services/x/ → /en/services/x/
export const swapLang = (path, lang) => path.replace(/^\/(ru|kk|en)\//, `/${lang}/`);

function head({ lang, t, page, assets }) {
  const url = abs(page.path);
  const robots = page.noindex || !config.indexing ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1';
  const og = abs(`/og/og-${lang}.jpg`);
  const alternates = page.alternates
    ? [
        ...config.languages.map((l) => `<link rel="alternate" hreflang="${config.htmlLang[l]}" href="${abs(swapLang(page.path, l))}">`),
        `<link rel="alternate" hreflang="x-default" href="${abs(page.path === paths.home(lang) ? '/' : swapLang(page.path, config.defaultLang))}">`,
      ]
    : [];
  const ogAlternates = config.languages.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${config.locales[l]}">`);

  return html`<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="robots" content="${robots}">
${page.noindex ? '' : `<link rel="canonical" href="${url}">`}
${alternates}
<link rel="preload" href="/fonts/druk-wide-bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/rubik-var.woff2" as="font" type="font/woff2" crossorigin>
<style>${assets.css}</style>
<meta name="theme-color" content="#0b0908">
<meta name="color-scheme" content="dark">
<meta name="format-detection" content="telephone=no">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${config.legalName}">
<meta property="og:title" content="${esc(page.ogTitle || page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(t.alts.logo)}">
<meta property="og:locale" content="${config.locales[lang]}">
${ogAlternates}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.ogTitle || page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${og}">
${(page.jsonld || []).length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': page.jsonld }).replace(/</g, '\\u003c')}</script>` : ''}
<script src="${assets.js}" defer></script>
</head>`;
}

function langSwitch({ lang, t, page }) {
  return html`<ul class="lang" aria-label="${esc(t.ui.language)}">${config.languages.map((l) => {
    const href = page.alternates ? swapLang(page.path, l) : paths.home(l);
    return l === lang
      ? `<li><span aria-current="true" lang="${l}" title="${config.langNames[l]}">${config.langShort[l]}</span></li>`
      : `<li><a href="${href}" hreflang="${config.htmlLang[l]}" lang="${l}" title="${config.langNames[l]}" data-lang="${l}">${config.langShort[l]}</a></li>`;
  })}</ul>`;
}

function header({ lang, t, page }) {
  const home = paths.home(lang);
  const onHome = page.path === home;
  const a = (id) => (onHome ? `#${id}` : `${home}#${id}`);
  const n = t.ui.nav;
  return html`<header class="site-header" data-header>
<div class="wrap header-inner">
<a class="brand" href="${home}" aria-label="Sparks — ${esc(t.ui.home)}">${mark('brand-mark')}<span class="brand-word">SPARKS</span></a>
<nav class="nav" id="nav" aria-label="${esc(t.ui.menu)}" data-nav>
<ul class="nav-list">
<li><a href="${a('about')}">${n.about}</a></li>
<li><a href="${a('services')}">${n.services}</a></li>
<li><a href="${a('concepts')}">${n.concepts}</a></li>
<li><a href="${paths.service(lang, 'new-year-corporate')}#packages">${n.packages}</a></li>
<li><a href="${a('process')}">${n.process}</a></li>
<li><a href="${a('contacts')}">${n.contacts}</a></li>
</ul>
${langSwitch({ lang, t, page })}
<a class="btn btn-sm nav-cta" href="${a('lead')}">${t.ui.cta}</a>
</nav>
<button class="burger" type="button" aria-controls="nav" aria-expanded="false" data-burger><span class="sr-only" data-open-label="${esc(t.ui.menu)}" data-close-label="${esc(t.ui.close)}">${t.ui.menu}</span><span class="burger-lines" aria-hidden="true"></span></button>
</div>
</header>`;
}

export function contactLinks(lang, t, cls = 'contact-links') {
  return html`<ul class="${cls}">
<li><a href="tel:${config.phone}">${icon('phone')}<span>${config.phoneDisplay}</span></a></li>
<li><a href="${config.whatsapp}" rel="noopener" target="_blank">${icon('whatsapp')}<span>WhatsApp</span></a></li>
<li><a href="${config.telegram}" rel="noopener" target="_blank">${icon('telegram')}<span>Telegram</span></a></li>
<li><a href="${config.instagram}" rel="noopener" target="_blank">${icon('instagram')}<span>Instagram</span></a></li>
<li><a href="mailto:${config.email}">${icon('mail')}<span>${config.email}</span></a></li>
</ul>`;
}

function footer({ lang, t, page }) {
  const year = new Date().getFullYear();
  return html`<footer class="site-footer">
<div class="wrap footer-grid">
<div class="footer-brand">
<a class="brand" href="${paths.home(lang)}">${mark('brand-mark')}<span class="brand-word">SPARKS</span></a>
<p>${t.ui.footerTagline}</p>
${langSwitch({ lang, t, page })}
</div>
<nav aria-label="${esc(t.ui.services)}">
<p class="footer-title">${t.ui.services}</p>
<ul>${Object.entries(t.services).map(([slug, s]) => `<li><a href="${paths.service(lang, slug)}">${esc(s.name)}</a></li>`)}</ul>
</nav>
<div>
<p class="footer-title">${t.ui.nav.contacts}</p>
${contactLinks(lang, t, 'footer-contacts')}
</div>
</div>
<div class="wrap footer-bottom">
<p>© ${year} ${config.legalName}. ${t.ui.rights}</p>
<a href="${paths.privacy(lang)}">${t.ui.privacy}</a>
</div>
</footer>`;
}

export function layout({ lang, t, page, assets, body }) {
  return html`<!doctype html>
<html lang="${config.htmlLang[lang]}" dir="ltr" class="no-js">
${head({ lang, t, page, assets })}
<body class="${page.bodyClass || ''}">
<a class="skip" href="#main">${t.ui.skip}</a>
${header({ lang, t, page })}
<main id="main" tabindex="-1">
${body}
</main>
${footer({ lang, t, page })}
</body>
</html>
`;
}
