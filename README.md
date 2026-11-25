# Каркасвуд (Karkaswood)

Сайт каркасной мастерской из села Косулино: каталог построек с ценами и фотографиями, объёмные модели с планировками, панель мастерской и серверная часть.

[Открыть сайт](https://zasamznal.github.io/karkaswood/) · [Открыть панель](https://zasamznal.github.io/karkaswood/admin/)

Ветка `ai-handoff` содержит исходники витрины, панели и сервера. Опубликованный сайт собирается из ветки `main`.

## Документация

| Документ | Для кого |
| --- | --- |
| [docs/AI-HANDOFF.md](docs/AI-HANDOFF.md) | разработчик или ИИ, который продолжит работу: устройство, данные, правила |
| [docs/TILDA.md](docs/TILDA.md) | перенос на Tilda и другие конструкторы |
| [docs/DEPLOY.md](docs/DEPLOY.md) | публикация сайта, обновление сервера, свой домен, индексация |
| [docs/LEGAL.md](docs/LEGAL.md) | требования законов РФ: что сделано и что остаётся за владельцем |
| [docs/OWNER-GUIDE.md](docs/OWNER-GUIDE.md) | памятка для владельца мастерской |
| [docs/CONTENT.md](docs/CONTENT.md) | все тексты и каталог одним файлом |
| [docs/WORKLOG.md](docs/WORKLOG.md) | журнал доработки |

## Запуск на своём компьютере

Нужны Git и Python 3. Для тестового сервера — Node.js 22 или новее.

```sh
git clone --branch ai-handoff https://github.com/zasamznal/karkaswood.git
cd karkaswood
python3 -m http.server 8000 --bind 127.0.0.1
```

Откройте [сайт](http://127.0.0.1:8000/) или [панель](http://127.0.0.1:8000/admin/). В панели можно менять карточки, тексты и оформление и смотреть результат кнопкой «Предпросмотр»: черновик хранится в браузере, опубликованный сайт не меняется.

Чтобы проверить вход владельца и публикацию:

```sh
npm run dev:api     # тестовый сервер на http://127.0.0.1:8787, пароль владельца: demo
npm run test:api    # самопроверка сервера, запускается в соседнем окне
```

и один раз в консоли браузера на странице панели:

```js
localStorage.setItem('kw:dev-api', 'http://127.0.0.1:8787/api'); location.reload();
```

## Где что менять

| Задача | Файлы |
| --- | --- |
| Главная страница | `index.html`, `assets/app.js`, `assets/style.css`, `assets/sections.js`, `assets/sections.css` |
| Тексты по умолчанию и схема данных | `assets/site-defaults.js` |
| Стартовый каталог | `data/site.json` |
| Каталог и карточки | `assets/catalog.js`, `assets/project-offers.js`, `assets/project-covers.js`, `assets/workshop-photos.js` |
| Связь с мастерской | `assets/channels.js`, `assets/contact.js` |
| Объёмные модели | `assets/project-definitions.js`, `assets/project-geometry.js`, `assets/project-viewer.js`, `assets/viewer.js`, `assets/plan-overlay.js`, `assets/tour-registry.js` |
| Новогоднее оформление | `assets/season.js`, `assets/season-start.js`, `assets/season.css`, `assets/holiday-*.css`, `admin/holiday.css` |
| Панель мастерской | `admin/shell.js`, `admin/items.js`, `admin/settings.js`, `admin/extra.css` |
| Реквизиты, условия, политика | `info/`, `assets/legal-validation.js` |
| Вставка модели на другой сайт | `embed/` |
| Сервер | `backend/worker.mjs`, `backend/media.mjs`, `drizzle/0000_workshop.sql` |
| Адрес сервера и сайта | `assets/config.js`, константа `SITE_URL` в `backend/worker.mjs` |

## Каталог и сервер

Витрина запрашивает каталог у сервера. Если он недоступен, берёт последнюю успешную копию из браузера или стартовый каталог `data/site.json`. Публикации из панели сохраняются в базе D1 независимо от Git.

Сервер бывает двух версий. Прежняя хранит карточки и базовые настройки. Новая (в этой ветке) дополнительно хранит тексты сайта, запасные контакты, календарь оформления, комплектацию и галереи карточек и сообщает об этом полем `"schema": 2`. Панель работает с обеими: поля, которые сервер пока не умеет хранить, закрыты замком. Как обновить сервер — в [docs/DEPLOY.md](docs/DEPLOY.md).

Сборка модуля для Cloudflare Worker:

```sh
npm ci
npm run build      # dist/server/index.js
```

В секретах Worker задаются `KW_OWNER_PASSWORD_HASH` (SHA-256 пароля в UTF-8, 64 строчных шестнадцатеричных символа) и `KW_SESSION_SECRET` (случайная строка от 32 символов). Рабочие секреты и резервные копии базы хранятся отдельно от Git.
