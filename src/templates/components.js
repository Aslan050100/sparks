import config from '../config.js';
import { contactLinks } from './layout.js';
import { esc, formatPrice, html, icon, paths, picture } from './helpers.js';

export const sectionHead = (label, title, id, extra = '') => html`<div class="section-head">
<p class="eyebrow">${label}</p>
<h2 id="${id}">${title}</h2>${extra}
</div>`;

export function serviceCards(lang, t, exclude) {
  const entries = Object.entries(t.services).filter(([slug]) => slug !== exclude);
  return html`<ul class="service-grid">${entries.map(
    ([slug, s], i) => html`<li><a class="service-card" href="${paths.service(lang, slug)}">
<span class="service-num">${String(i + 1).padStart(2, '0')}</span>
<h3>${esc(s.name)}</h3>
<p>${esc(s.short)}</p>
<span class="service-more">${t.ui.more}${icon('arrow')}</span>
</a></li>`,
  )}</ul>`;
}

export function concepts(t) {
  return html`<ul class="concept-grid">${t.concepts.map(
    (c) => html`<li class="concept">
${picture(c.img, t.alts[c.img], { sizes: '(min-width: 1100px) 20vw, (min-width: 640px) 33vw, 50vw' })}
<h3>${esc(c.t)}</h3>
<p>${esc(c.d)}</p>
</li>`,
  )}</ul>`;
}

export function processSteps(t) {
  return html`<ol class="process">${t.process.map(
    (s, i) => html`<li><span class="diamond" aria-hidden="true"><span>${i + 1}</span></span><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></li>`,
  )}</ol>`;
}

export function packagesTable(lang, t) {
  const p = t.packages;
  const cell = (v) =>
    v === 1 ? '<span class="yes" aria-label="✓">✓</span>' : v === 0 ? '<span class="no" aria-label="—">—</span>' : esc(v);
  return html`<div class="table-scroll" tabindex="0" role="region" aria-labelledby="packages">
<table class="packages-table">
<thead><tr><th scope="col">${p.rowsTitle}</th>${p.names.map((n, i) => `<th scope="col"${i === 1 ? ' class="hl"' : ''}>${esc(n)}</th>`)}</tr></thead>
<tbody>${p.rows.map(([name, ...vals]) => html`<tr><th scope="row">${esc(name)}</th>${vals.map((v, i) => `<td${i === 1 ? ' class="hl"' : ''}>${cell(v)}</td>`)}</tr>`)}</tbody>
<tfoot><tr><th scope="row">${p.price}</th>${p.prices.map((v, i) => `<td${i === 1 ? ' class="hl"' : ''}>${formatPrice(v, lang)}</td>`)}</tr></tfoot>
</table>
</div>
<p class="note">${esc(p.luxuryNote)}</p>`;
}

export function packageCards(lang, t) {
  const p = t.packages;
  // Show a few shared items plus everything that differs between packages.
  const differs = (r) => new Set(r.slice(1)).size > 1;
  const shared = p.rows.filter((r) => !differs(r)).slice(0, 3);
  return html`<ul class="package-grid">${p.names.map((name, i) => {
    const items = [...shared, ...p.rows.filter((r) => differs(r) && r[i + 1] !== 0)];
    const label = (r) => (typeof r[i + 1] === 'string' ? `${r[0]} · ${r[i + 1]}` : r[0]);
    return html`<li class="package${i === 1 ? ' package-hl' : ''}">
<h3>${esc(name)}</h3>
<p class="price">${formatPrice(p.prices[i], lang)}</p>
<ul>${items.map((r) => `<li>${esc(label(r))}</li>`)}</ul>
</li>`;
  })}</ul>`;
}

export function addons(t) {
  return html`<ul class="addon-grid">${t.packages.addons.map((a) => html`<li><strong>${esc(a.t)}</strong>${a.d ? `<span>${esc(a.d)}</span>` : ''}</li>`)}</ul>`;
}

export function faq(items) {
  return html`<div class="faq">${items.map(
    (f) => html`<details><summary><h3>${esc(f.q)}</h3></summary><p>${esc(f.a)}</p></details>`,
  )}</div>`;
}

export function leadForm(lang, t, preset = '') {
  const f = t.form;
  return html`<section class="section lead" id="lead" aria-labelledby="lead-title">
<div class="wrap lead-grid">
<div class="lead-intro" id="contacts">
<p class="eyebrow">${t.ui.nav.contacts}</p>
<h2 id="lead-title">${f.title}</h2>
<p>${f.text}</p>
${contactLinks(lang, t)}
</div>
<form class="form" action="/api/lead" method="post" data-lead-form novalidate>
<input type="hidden" name="lang" value="${lang}">
<div class="hp" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<div class="field"><label for="f-name">${f.name} <abbr title="${f.required}">*</abbr></label><input id="f-name" name="name" type="text" autocomplete="name" required maxlength="100"></div>
<div class="field"><label for="f-phone">${f.phone} <abbr title="${f.required}">*</abbr></label><input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="30" placeholder="+7 ___ ___ __ __" pattern="[0-9+()\\-\\s]{7,30}"></div>
<div class="field field-full"><label for="f-type">${f.type}</label><select id="f-type" name="type"><option value="">${f.typePlaceholder}</option>${Object.entries(f.types).map(([v, l]) => `<option value="${v}"${v === preset ? ' selected' : ''}>${esc(l)}</option>`)}</select></div>
<div class="field"><label for="f-date">${f.date}</label><input id="f-date" name="date" type="date"></div>
<div class="field"><label for="f-guests">${f.guests}</label><input id="f-guests" name="guests" type="number" min="1" max="100000" inputmode="numeric"></div>
<div class="field field-full"><label for="f-message">${f.message}</label><textarea id="f-message" name="message" rows="3" maxlength="2000" placeholder="${esc(f.messagePlaceholder)}"></textarea></div>
<div class="field field-full check"><input id="f-consent" name="consent" type="checkbox" value="1" required><label for="f-consent">${f.consent} <a href="${paths.privacy(lang)}">${f.consentLink}</a></label></div>
<div class="field-full form-actions"><button class="btn" type="submit" data-sending="${esc(f.sending)}">${f.submit}</button></div>
<p class="form-status field-full" role="status" aria-live="polite" data-status data-success="${esc(f.success)}" data-error="${esc(f.error)}" data-invalid="${esc(f.invalid)}"></p>
</form>
</div>
</section>`;
}

export function breadcrumbs(items) {
  return html`<nav class="breadcrumbs" aria-label="Breadcrumbs"><ol>${items.map((it, i) =>
    i === items.length - 1 ? `<li><span aria-current="page">${esc(it.name)}</span></li>` : `<li><a href="${it.path}">${esc(it.name)}</a></li>`,
  )}</ol></nav>`;
}

export const phoneLink = () => `<a href="tel:${config.phone}">${config.phoneDisplay}</a>`;
