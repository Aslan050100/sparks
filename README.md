# Sparks Event Agency — сайт

Лендинг агентства на трёх языках (RU / KZ / EN) с формой заявки. Статический HTML собирается скриптом на Node.js без зависимостей. Небольшой сервер на Node отдаёт файлы и принимает заявки.

## Быстрый старт (локально)

Нужен Node.js 20+.

```bash
npm run dev        # сборка + сервер на http://localhost:8080
npm test           # сборка + 41 проверка: статусы, SEO, краулеры, форма
```

Заявки сохраняются в `data/leads.jsonl` (одна строка — одна заявка).

### Посмотреть без сервера

```bash
npm run preview
```

Команда создаёт папку `preview/`:
- `preview/site/index.html` — весь сайт, открывается двойным кликом из папки (все страницы и языки). Её можно заархивировать и отправить.
- `preview/sparks-ru.html` — главная страница одним файлом.

Форма заявки в превью не отправляется, для неё нужен `server.js`.

## Структура

```
src/
  config.js            контакты, домен, языки
  content/ru|kk|en.js  все тексты сайта
  templates/           HTML-шаблоны (layout, секции, страницы)
  styles/main.css      стили (встраиваются в HTML)
  scripts/main.js      меню, анимации, отправка формы
  static/              шрифты, картинки, иконки, OG-изображения
scripts/build.js       генератор → dist/
server.js              сервер: статика + POST /api/lead
tests/site.test.js     автотесты
tools/prepare-assets.py  конвертация шрифтов/фото из assets-src/
```

Чтобы изменить текст, правьте `src/content/*.js`. Сборка сама проверит, что во всех трёх языках одинаковый набор ключей.

## URL-структура

| URL | Страница |
|---|---|
| `/` | 302-редирект на язык посетителя (cookie → Accept-Language → `ru`) |
| `/ru/`, `/kk/`, `/en/` | Главная |
| `/{lang}/services/corporate-events/` | Корпоративы |
| `/{lang}/services/new-year-corporate/` | Новогодний корпоратив + пакеты |
| `/{lang}/services/business-forums/` | Форумы и конференции |
| `/{lang}/services/weddings/` | Свадьбы |
| `/{lang}/services/team-building/` | Тимбилдинг |
| `/{lang}/services/private-events/` | Частные мероприятия |
| `/{lang}/privacy/` | Политика конфиденциальности |
| `/{lang}/thanks/` | Спасибо за заявку (noindex) |

## SEO и технические требования

- **robots.txt** — всё открыто, кроме `/api/`. Отдельной группой явно разрешены Googlebot, Bingbot, YandexBot, **OAI-SearchBot**, ChatGPT-User, GPTBot, PerplexityBot, ClaudeBot, Applebot.
- **sitemap.xml** — 24 URL, у каждого есть `lastmod` и hreflang-альтернативы (`ru`, `kk`, `en`, `x-default`).
- **canonical** — абсолютный, на себя, для каждой индексируемой страницы.
- **index/noindex** — `index, follow, max-image-preview:large` на контентных страницах. Страницы `thanks` и 404 закрыты через `<meta name="robots" content="noindex">` и заголовок `X-Robots-Tag`. При `INDEXING=off` закрыт весь сайт (для тестового стенда).
- **HTTP-статусы**: 200 для страниц; 301 для `/ru` → `/ru/`, `index.html` → `/`, UPPERCASE → lowercase; 302 для `/`; 404 с локализованной страницей; 405 с заголовком `Allow`; 304 по ETag.
- **Core Web Vitals**: CSS встроен в HTML, JS 3 КБ с `defer`, предзагрузка шрифтов, AVIF/WebP с `srcset`, `width/height` у всех картинок, `fetchpriority="high"` для LCP-картинки, Brotli/gzip, кэширование. Lighthouse: Performance 97–100, Accessibility, Best Practices и SEO по 100, CLS = 0.
- **Мобильная версия**: адаптивная вёрстка от 320 px, мобильное меню.
- **Перелинковка**: карточки услуг на главной, блок «Другие услуги» на каждой странице услуги, хлебные крошки, все услуги в футере, переключатель языков.
- **schema.org** (JSON-LD): Organization, WebSite, WebPage, FAQPage, ItemList, Service, BreadcrumbList.
- **Open Graph и Twitter Cards**: для каждого языка своя картинка 1200×630.
- **Доступность для краулеров**: весь контент есть в HTML с сервера, JavaScript не нужен. Тесты запрашивают каждый URL из sitemap с User-Agent OAI-SearchBot, Googlebot, Bingbot, YandexBot и ChatGPT-User.
- **llms.txt** — краткое описание компании для AI-ассистентов.

## Продакшн

```bash
SITE_URL=https://sparks-agency.kz npm run build
PORT=8080 HSTS=on node server.js
```

Переменные окружения:

| Переменная | Назначение |
|---|---|
| `SITE_URL` | домен для canonical, sitemap и OG (по умолчанию `https://sparks-agency.kz`) |
| `INDEXING=off` | закрыть сайт от индексации (тестовый стенд) |
| `PORT`, `HOST` | адрес сервера (по умолчанию `0.0.0.0:8080`) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | пересылать заявки в Telegram |
| `LEADS_FILE` | куда сохранять заявки (по умолчанию `data/leads.jsonl`) |
| `HSTS=on` | заголовок Strict-Transport-Security (только за HTTPS) |

Рекомендуемая схема: nginx (HTTPS, редирект `www` → без `www` и `http` → `https`) проксирует запросы на `node server.js`, процесс держит systemd или pm2.

```nginx
server {
  listen 443 ssl http2;
  server_name sparks-agency.kz;
  # ssl_certificate ...;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
  }
}
server { listen 80; server_name sparks-agency.kz www.sparks-agency.kz; return 301 https://sparks-agency.kz$request_uri; }
server { listen 443 ssl; server_name www.sparks-agency.kz; return 301 https://sparks-agency.kz$request_uri; }
```

## Ассеты

Исходники лежат в `assets-src/`, результат — в `src/static/`. Перегенерировать:

```bash
pip install pillow fonttools brotli
DRUK_FONT=/path/to/DrukWideCyr-Bold.otf python3 tools/prepare-assets.py
python3 tools/concept-art.py   # SVG-иллюстрации концепций вечера
```
