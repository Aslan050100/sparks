import { readFileSync } from 'node:fs';
import config from '../config.js';

export const images = JSON.parse(readFileSync(new URL('../images.json', import.meta.url), 'utf8'));
const markPath = JSON.parse(readFileSync(new URL('./mark-path.json', import.meta.url), 'utf8')).d;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// Tagged template: arrays are joined, null/false/undefined render as ''.
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    out += (Array.isArray(v) ? v.join('') : v === null || v === undefined || v === false ? '' : v) + strings[i + 1];
  });
  return out;
}

export const abs = (path) => config.siteUrl + path;

export const paths = {
  home: (lang) => `/${lang}/`,
  service: (lang, slug) => `/${lang}/services/${slug}/`,
  privacy: (lang) => `/${lang}/privacy/`,
  thanks: (lang) => `/${lang}/thanks/`,
};

let markCount = 0;
export function mark(cls = 'mark', title = '') {
  const id = `gm${++markCount}`;
  return html`<svg class="${cls}" viewBox="-290 -312 580 624" ${title ? `role="img" aria-label="${esc(title)}"` : 'aria-hidden="true" focusable="false"'}><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d08e"/><stop offset=".35" stop-color="#c8883f"/><stop offset=".6" stop-color="#e9b464"/><stop offset="1" stop-color="#9a6326"/></linearGradient></defs><path d="${markPath}" fill="none" stroke="url(#${id})" stroke-width="12"/></svg>`;
}

// <picture> with AVIF + WebP sources; width/height always set to avoid layout shift.
export function picture(name, alt, { sizes = '100vw', eager = false, cls = '' } = {}) {
  const img = images[name];
  if (!img) throw new Error(`Unknown image ${name}`);
  if (img.svg) {
    return html`<picture${cls ? ` class="${cls}"` : ''}><img src="/img/${name}.svg" alt="${esc(alt)}" width="${img.w}" height="${img.h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
  }
  const set = (ext) => img.widths.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(', ');
  const largest = img.widths[img.widths.length - 1];
  const h = Math.round((img.h * largest) / img.w);
  return html`<picture${cls ? ` class="${cls}"` : ''}><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="/img/${name}-${largest}.webp" alt="${esc(alt)}" width="${largest}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
}

export const ICONS = {
  phone: '<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/>',
  whatsapp: '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/>',
  telegram: '<path d="M21.9 4.3 18.7 19.5c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.3l-4.7-1.5c-1-.3-1-1 .2-1.5L20.5 3.2c.9-.3 1.6.2 1.4 1.1z"/>',
  instagram: '<path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM21.9 8c-.1-1.6-.4-3-1.6-4.2S17.6 2.2 16 2.1c-1.6-.1-6.4-.1-8 0-1.6.1-3 .4-4.2 1.6S2.2 6.4 2.1 8c-.1 1.6-.1 6.4 0 8 .1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.6.1 6.4.1 8 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.6.1-6.4 0-8zm-2.2 10a3.2 3.2 0 0 1-1.8 1.8c-1.3.5-4.3.4-5.7.4s-4.4.1-5.7-.4A3.2 3.2 0 0 1 4.7 18c-.5-1.3-.4-4.3-.4-5.7s-.1-4.4.4-5.7a3.2 3.2 0 0 1 1.8-1.8c1.3-.5 4.3-.4 5.7-.4s4.4-.1 5.7.4a3.2 3.2 0 0 1 1.8 1.8c.5 1.3.4 4.3.4 5.7s.1 4.4-.4 5.7z"/>',
  mail: '<path d="M20 4H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>',
  arrow: '<path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/>',
};

export const icon = (name, cls = 'ico') =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">${ICONS[name]}</svg>`;
