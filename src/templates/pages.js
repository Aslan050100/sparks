import config from '../config.js';
import { addons, breadcrumbs, concepts, faq, leadForm, packageCards, packagesTable, processSteps, sectionHead, serviceCards } from './components.js';
import { abs, esc, html, icon, images, mark, paths, picture } from './helpers.js';

const ORG_ID = abs('/#organization');
const AREA_SERVED = [
  { '@type': 'City', name: config.city },
  { '@type': 'Country', name: 'Kazakhstan' },
];
const SITE_ID = abs('/#website');

// Entities shared by every page.
function baseGraph(lang, t) {
  return [
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: config.legalName,
      alternateName: config.brand,
      url: abs('/'),
      logo: { '@type': 'ImageObject', url: abs('/icon-512.png'), width: 512, height: 512 },
      image: abs(`/og/og-${lang}.jpg`),
      description: t.home.description,
      email: config.email,
      telephone: config.phone,
      sameAs: [config.instagram, config.telegram],
      address: { '@type': 'PostalAddress', addressLocality: config.city, addressCountry: config.country },
      areaServed: AREA_SERVED,
      knowsLanguage: ['ru', 'kk', 'en'],
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: config.phone,
        email: config.email,
        contactType: 'customer service',
        areaServed: 'KZ',
        availableLanguage: ['Russian', 'Kazakh', 'English'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': SITE_ID,
      url: abs('/'),
      name: config.legalName,
      publisher: { '@id': ORG_ID },
      inLanguage: ['ru', 'kk', 'en'],
    },
  ];
}

function webPage(lang, page, extra = {}) {
  return {
    '@type': 'WebPage',
    '@id': abs(page.path) + '#webpage',
    url: abs(page.path),
    name: page.title,
    description: page.description,
    inLanguage: config.htmlLang[lang],
    isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID },
    ...extra,
  };
}

function breadcrumbLd(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function homePage(lang, t) {
  const h = t.home;
  const page = { path: paths.home(lang), title: h.title, description: h.description, alternates: true, bodyClass: 'is-home' };
  page.jsonld = [
    ...baseGraph(lang, t),
    webPage(lang, page, { '@type': ['WebPage', 'FAQPage'], primaryImageOfPage: abs(`/og/og-${lang}.jpg`), mainEntity: h.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }),
    {
      '@type': 'ItemList',
      name: h.servicesTitle,
      itemListElement: Object.entries(t.services).map(([slug, s], i) => ({ '@type': 'ListItem', position: i + 1, name: s.name, url: abs(paths.service(lang, slug)) })),
    },
  ];

  const body = html`<section class="hero" aria-labelledby="hero-title">
<div class="hero-glow" aria-hidden="true"></div>
<div class="wrap hero-inner">
${picture('logo', t.alts.logo, { sizes: '(min-width: 800px) 240px, 180px', eager: true, cls: 'hero-logo' })}
<p class="eyebrow">${h.eyebrow}</p>
<h1 id="hero-title">${h.h1}</h1>
<p class="hero-lead">${h.lead}</p>
<div class="hero-actions">
<a class="btn" href="#lead">${t.ui.cta}</a>
<a class="btn btn-ghost" href="#services">${t.ui.ctaSecondary}</a>
</div>
</div>
</section>

<section class="section" aria-labelledby="about">
<div class="wrap about-grid">
${sectionHead(h.about.label, h.about.title, 'about')}
<div class="about-text">${h.about.p.map((p) => `<p>${p}</p>`)}</div>
<ul class="facts">${h.about.facts.map((f) => `<li><strong>${esc(f.n)}</strong><span>${esc(f.t)}</span></li>`)}</ul>
</div>
</section>

<section class="section section-alt" aria-labelledby="services">
<div class="wrap">
${sectionHead(h.servicesLabel, h.servicesTitle, 'services')}
${serviceCards(lang, t)}
</div>
</section>

<section class="section gallery" aria-label="Sparks">
<div class="wrap gallery-grid">
${['dj', 'handshake', 'guests'].map((n) => picture(n, t.alts[n], { sizes: '(min-width: 800px) 33vw, 80vw' }))}
</div>
</section>

<section class="section" aria-labelledby="concepts">
<div class="wrap">
${sectionHead(h.conceptsLabel, h.conceptsTitle, 'concepts')}
${concepts(t)}
<p class="note note-gold">${mark('note-mark')}${esc(h.conceptsNote)}</p>
</div>
</section>

<section class="section section-alt" aria-labelledby="packages">
<div class="wrap">
${sectionHead(h.packagesLabel, h.packagesTitle, 'packages', `<p class="section-text">${esc(h.packagesText)}</p>`)}
${packageCards(lang, t)}
<p class="center"><a class="link-arrow" href="${paths.service(lang, 'new-year-corporate')}#packages">${h.packagesLink}${icon('arrow')}</a></p>
</div>
</section>

<section class="section" aria-labelledby="process">
<div class="wrap">
${sectionHead(h.processLabel, h.processTitle, 'process')}
${processSteps(t)}
</div>
</section>

<section class="section section-alt" aria-labelledby="faq">
<div class="wrap narrow">
${sectionHead(h.faqLabel, h.faqTitle, 'faq')}
${faq(h.faq)}
</div>
</section>

${leadForm(lang, t)}`;
  return { page, body };
}

export function servicePage(lang, t, slug) {
  const s = t.services[slug];
  const path = paths.service(lang, slug);
  const crumbs = [
    { name: t.ui.home, path: paths.home(lang) },
    { name: s.name, path },
  ];
  const page = { path, title: s.title, description: s.description, alternates: true, ogTitle: s.h1 };
  const service = {
    '@type': 'Service',
    '@id': abs(path) + '#service',
    name: s.name,
    serviceType: s.name,
    description: s.description,
    url: abs(path),
    provider: { '@id': ORG_ID },
    areaServed: AREA_SERVED,
    availableLanguage: ['ru', 'kk', 'en'],
    image: abs(`/img/${s.img}-${images[s.img].widths.at(-1)}.webp`),
  };
  page.jsonld = [...baseGraph(lang, t), webPage(lang, page, { breadcrumb: breadcrumbLd(crumbs), mainEntity: { '@id': service['@id'] } }), service];

  const body = html`<section class="page-hero" aria-labelledby="page-title">
<div class="wrap page-hero-grid">
<div>
${breadcrumbs(crumbs)}
<h1 id="page-title">${esc(s.h1)}</h1>
<p class="hero-lead">${esc(s.lead)}</p>
<div class="hero-actions">
<a class="btn" href="#lead">${t.ui.cta}</a>
<a class="btn btn-ghost" href="tel:${config.phone}">${icon('phone')}${config.phoneDisplay}</a>
</div>
</div>
${picture(s.img, t.alts[s.img], { sizes: '(min-width: 1240px) 430px, (min-width: 900px) 36vw, 100vw', eager: true, cls: 'page-hero-img' })}
</div>
</section>

<section class="section" aria-labelledby="included">
<div class="wrap split">
${sectionHead(s.name, t.ui.included, 'included')}
<ul class="diamond-list">${s.includes.map((i) => `<li>${esc(i)}</li>`)}</ul>
</div>
</section>

${s.showPackages
    ? html`<section class="section section-alt" aria-labelledby="packages">
<div class="wrap">
${sectionHead(t.home.packagesLabel, t.packages.title, 'packages')}
${packagesTable(lang, t)}
</div>
</section>
<section class="section" aria-labelledby="addons">
<div class="wrap">
${sectionHead(t.home.packagesLabel, t.packages.addonsTitle, 'addons', `<p class="section-text">${esc(t.packages.addonsText)}</p>`)}
${addons(t)}
</div>
</section>
<section class="section section-alt" aria-labelledby="concepts">
<div class="wrap">
${sectionHead(t.home.conceptsLabel, t.home.conceptsTitle, 'concepts')}
${concepts(t)}
<p class="note note-gold">${mark('note-mark')}${esc(t.home.conceptsNote)}</p>
</div>
</section>`
    : html`<section class="section section-alt" aria-labelledby="formats">
<div class="wrap">
${sectionHead(s.name, t.ui.formats, 'formats')}
<ul class="format-grid">${s.formats.map((f) => `<li><h3>${esc(f.t)}</h3><p>${esc(f.d)}</p></li>`)}</ul>
</div>
</section>`}

<section class="section" aria-labelledby="why">
<div class="wrap">
${sectionHead('Sparks', t.ui.why, 'why')}
<ul class="why-grid">${s.why.map((w) => `<li>${mark('why-mark')}<p>${esc(w)}</p></li>`)}</ul>
</div>
</section>

<section class="section section-alt" aria-labelledby="process">
<div class="wrap">
${sectionHead(t.home.processLabel, t.home.processTitle, 'process')}
${processSteps(t)}
</div>
</section>

${leadForm(lang, t, s.formType)}

<section class="section" aria-labelledby="related">
<div class="wrap">
${sectionHead(t.ui.services, t.ui.related, 'related')}
${serviceCards(lang, t, slug)}
</div>
</section>`;
  return { page, body };
}

export function privacyPage(lang, t) {
  const p = t.privacy;
  const path = paths.privacy(lang);
  const crumbs = [{ name: t.ui.home, path: paths.home(lang) }, { name: p.h1, path }];
  const page = { path, title: p.title, description: p.description, alternates: true };
  page.jsonld = [...baseGraph(lang, t), webPage(lang, page, { breadcrumb: breadcrumbLd(crumbs) })];
  const body = html`<section class="section doc">
<div class="wrap narrow">
${breadcrumbs(crumbs)}
<h1>${p.h1}</h1>
<p class="muted">${p.updated}</p>
${p.sections.map(([h, text]) => `<h2>${esc(h)}</h2><p>${esc(text)}</p>`)}
<h2>${t.ui.nav.contacts}</h2>
<p><a href="mailto:${config.email}">${config.email}</a> · <a href="tel:${config.phone}">${config.phoneDisplay}</a></p>
</div>
</section>`;
  return { page, body };
}

export function thanksPage(lang, t) {
  const p = t.thanks;
  const page = { path: paths.thanks(lang), title: p.title, description: p.description, noindex: true, alternates: true };
  const body = html`<section class="section message-page">
<div class="wrap narrow center">
${mark('message-mark')}
<h1>${p.h1}</h1>
<p>${p.text}</p>
<div class="hero-actions">
<a class="btn" href="${paths.home(lang)}">${p.back}</a>
<a class="btn btn-ghost" href="${config.whatsapp}" rel="noopener" target="_blank">${icon('whatsapp')}WhatsApp</a>
</div>
</div>
</section>`;
  return { page, body };
}

export function notFoundPage(lang, t) {
  const p = t.notFound;
  const page = { path: `/${lang}/404.html`, title: p.title, description: p.description, noindex: true, alternates: false };
  const body = html`<section class="section message-page">
<div class="wrap narrow center">
<p class="big-code" aria-hidden="true">404</p>
<h1>${p.h1}</h1>
<p>${p.text}</p>
<div class="hero-actions"><a class="btn" href="${paths.home(lang)}">${p.back}</a></div>
</div>
</section>
<section class="section section-alt" aria-labelledby="services">
<div class="wrap">
${sectionHead(t.ui.services, t.home.servicesTitle, 'services')}
${serviceCards(lang, t)}
</div>
</section>`;
  return { page, body };
}
