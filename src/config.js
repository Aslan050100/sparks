// Site-wide settings. Values that differ between environments come from env vars.

const siteUrl = (process.env.SITE_URL || 'https://sparks-agency.kz').replace(/\/+$/, '');

export default {
  siteUrl,
  // INDEXING=off → every page gets noindex and robots.txt blocks everything (staging).
  indexing: (process.env.INDEXING || 'on') !== 'off',
  brand: 'Sparks',
  legalName: 'Sparks Event Agency',
  phone: '+77067290032',
  phoneDisplay: '+7 706 729 00 32',
  whatsapp: 'https://wa.me/77067290032',
  telegram: 'https://t.me/sparksagency',
  instagram: 'https://www.instagram.com/sparks/',
  email: 'pro@sparks-agency.kz',
  country: 'KZ',
  languages: ['ru', 'kk', 'en'],
  defaultLang: 'ru',
  locales: { ru: 'ru_RU', kk: 'kk_KZ', en: 'en_US' },
  htmlLang: { ru: 'ru', kk: 'kk', en: 'en' },
  langNames: { ru: 'Русский', kk: 'Қазақша', en: 'English' },
  langShort: { ru: 'RU', kk: 'KZ', en: 'EN' },
};
