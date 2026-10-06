# Senimen Event Agency — сайт

Лендинг ивент-агентства **Senimen** (Астана): форумы, конференции, концерты, корпоративы и свадьбы под ключ.
Домен: **https://senimenagency.kz**

Статический сайт: HTML + CSS + немного JS. Сборка не нужна — файлы из репозитория можно отдавать как есть.

## Структура

```
index.html              главная (одна страница с разделами)
privacy/index.html      политика конфиденциальности
404.html                страница «не найдено» (noindex)
css/style.css           стили (тёмная тема, золото #c9954f)
js/main.js              форма → сообщение в WhatsApp, ленивая загрузка видео
fonts/                  Druk Wide Cyr Bold (заголовки), Rubik (текст) — свои, без Google Fonts
assets/img/             оптимизированные фото (WebP 480–1800 px + один JPG на фото)
assets/video/           видео (mp4, h264, без звука)
robots.txt, sitemap.xml, llms.txt, site.webmanifest, og-image.jpg, иконки
_headers                кэш и заголовки безопасности для Netlify / Cloudflare Pages
server.js               локальный сервер (и простой вариант для VPS)
tests/site.test.js      автопроверки SEO, HTTP-статусов и доступа краулеров
assets-src/             исходные фото (в браузер не отдаются)
tools/                  скрипты для картинок
```

URL-структура: `/` — главная, `/privacy/` — политика, всё остальное — 404.
Разделы главной: `#services`, `#formats`, `#packages`, `#concepts`, `#how`, `#contact`, `#faq`.

## Запуск локально

```bash
npm start          # http://localhost:8080 (нужен Node.js 20+, зависимостей нет)
npm test           # 34 проверки: статусы, robots, sitemap, canonical, OG, schema.org, краулеры
```

Можно и без Node: `python3 -m http.server 8000`. Но тогда 404 и редиректы будут работать не так, как на хостинге.

## Деплой

- **GitHub Pages**: Settings → Pages → Branch `main`, папка `/ (root)`. Свой домен — файл `CNAME` с `senimenagency.kz` и DNS-записи у регистратора.
- **Netlify / Cloudflare Pages**: импорт репозитория, build command пустой, publish directory — корень. `_headers` применится автоматически.
- **Свой сервер (nginx)**:

```nginx
server {
  listen 443 ssl http2;
  server_name senimenagency.kz;
  root /var/www/senimen;
  error_page 404 /404.html;
  location = /index.html { return 301 /; }
  location ~ ^/(assets-src|tools|tests|server\.js|package\.json|README\.md|\.git) { return 404; }
  location /fonts/  { add_header Cache-Control "public, max-age=31536000, immutable"; }
  location /assets/ { add_header Cache-Control "public, max-age=2592000"; }
  location / { try_files $uri $uri/ =404; }
  gzip on; gzip_types text/css application/javascript application/xml image/svg+xml;
  add_header X-Content-Type-Options nosniff;
  add_header Referrer-Policy strict-origin-when-cross-origin;
}
server { listen 80; server_name senimenagency.kz www.senimenagency.kz; return 301 https://senimenagency.kz$request_uri; }
server { listen 443 ssl; server_name www.senimenagency.kz; return 301 https://senimenagency.kz$request_uri; }
```

## SEO — что сделано

| Пункт | Как реализовано |
|---|---|
| robots.txt | Всё открыто. Googlebot, YandexBot, Bingbot, **OAI-SearchBot**, ChatGPT-User, GPTBot, PerplexityBot, ClaudeBot, Applebot перечислены явно. Ссылка на sitemap |
| sitemap.xml | `/` и `/privacy/` с `lastmod` и картинками |
| canonical | Абсолютный `https://senimenagency.kz/...` на каждой странице |
| index/noindex | Страницы — `index, follow, max-image-preview:large`; 404 — `noindex` (meta + `X-Robots-Tag`) |
| HTTP status | 200 для страниц, 301 `/index.html` → `/` и `/privacy` → `/privacy/`, 404 со своей страницей, 405 на POST, 206 для видео |
| Core Web Vitals | Lighthouse: Performance 98 (моб.) / 100 (десктоп), LCP 2,1 с / 0,6 с, CLS 0, TBT 100 мс. Preload шрифтов и главного фото, WebP + srcset, width/height у всех картинок, lazy-loading, видео грузится только при прокрутке |
| Мобильная версия | Проверена на 320–1440 px, без горизонтальной прокрутки |
| Перелинковка | Меню, карточки услуг → проекты/пакеты/заявка, «по запросу» → форма, футер → политика, хлебные крошки на политике |
| schema.org | Organization (адрес, контакты, услуги), WebSite, WebPage + FAQPage, BreadcrumbList |
| Open Graph | Полный набор og:* и twitter:*, картинка 1200×630 `og-image.jpg` |
| Краулеры | Весь текст есть в HTML без JavaScript. Тесты запрашивают страницы с User-Agent OAI-SearchBot, ChatGPT-User, GPTBot, Googlebot, YandexBot, Bingbot, PerplexityBot |

## Как заменить фото

1. Положить оригинал в `assets-src/photos/<имя>.jpg` (имена: `hero-forum-stage`, `arena-forum`, `concert-lights`, `party-crowd`, `speaker`, `dj`, `hostess`, `guests`, `backstage-poster`, `registration-poster`).
2. Выполнить:

```bash
pip install pillow fonttools
DRUK_FONT=/path/to/DrukWideCyr-Bold.otf python3 tools/optimize-images.py   # WebP/JPG, иконки, og-image.jpg
python3 tools/render-pictures.py                                          # обновит srcset/размеры в index.html
npm test
```

## Видео

Сжимать перед добавлением (держать файлы до ~3 МБ):

```bash
ffmpeg -i input.mov -an -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p \
  -vf "scale=-2:1080" -movflags +faststart assets/video/name.mp4
```

## TODO

- [ ] Заменить временные фото: `arena-forum`, `speaker` (сейчас копия главного фото), `party-crowd`, `hostess` (сейчас копия `guests`)
- [ ] Логотип Senimen (сейчас текстовый логотип и буква «S» в иконке)
- [ ] Подтвердить Telegram (сейчас `t.me/sparksagency`)
- [ ] Форма: подключить CRM или Telegram-бота (сейчас открывает WhatsApp)
- [ ] Логотипы клиентов и партнёров, фото команды
- [ ] Яндекс.Метрика / GA, Яндекс.Вебмастер и Google Search Console (добавить sitemap)
- [ ] Проверить лицензию шрифта Druk Wide для веба
