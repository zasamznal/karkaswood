# Karkaswood

Каталог каркасных построек с интерактивными 3D-моделями и кабинетом владельца. Ветка `ai-handoff` содержит исходники витрины, админки и серверного API. Опубликованная витрина работает из ветки `main`.

[Открыть сайт](https://zasamznal.github.io/karkaswood/) · [Открыть админку](https://zasamznal.github.io/karkaswood/admin/)

## Запуск сайта на своём компьютере

Для витрины и деморежима админки достаточно Git и Python 3.

```sh
git clone --branch ai-handoff https://github.com/zasamznal/karkaswood.git
cd karkaswood
python -m http.server 8000 --bind 127.0.0.1
```

Откройте [локальный сайт](http://127.0.0.1:8000/) или [локальную админку](http://127.0.0.1:8000/admin/). Для проверки измените карточку или включите новогоднее оформление и нажмите «Предпросмотр». Черновик хранится в этом браузере. Публичный каталог при этом остаётся доступен покупателям в опубликованном виде.

## Где менять сайт

| Задача | Файлы |
| --- | --- |
| Главная страница и каталог | `index.html`, `assets/style.css`, `assets/catalog.js` |
| Карточки и обложки | `data/site.json`, `assets/project-covers.js`, `assets/catalog-covers/` |
| 3D-туры | `assets/tour-registry.js`, `assets/viewer.js`, `assets/project-viewer.js`, `assets/project-definitions.js`, `assets/project-geometry.js` |
| Новогоднее оформление | `assets/season.js`, `assets/season.css`, `assets/holiday-*.css`, `admin/holiday.css` |
| Редактор карточек и настроек | `admin/shell.js`, `admin/items.js`, `admin/settings.js` |
| Контакты и реквизиты | `info/`, `assets/legal-validation.js`, настройки кабинета |
| Сервер, авторизация и фотографии | `backend/worker.mjs`, `backend/media.mjs`, `drizzle/0000_workshop.sql` |

## Каталог и сервер

Витрина запрашивает каталог у API. Если запрос недоступен, она берёт последнюю успешную копию из браузера или стартовый каталог из `data/site.json`. На момент передачи все десять публичных карточек и настройки совпадали со стартовым каталогом. Новые публикации из админки сохраняются в базе D1 независимо от Git.

Для сборки Cloudflare Worker понадобятся Node.js и npm. Выполните обе команды из корня проекта.

```sh
npm ci
npm run build
```

Готовый модуль — `dist/server/index.js`. Для отдельного экземпляра API подключите собственную D1 под именем `DB` и один раз примените к пустой базе `drizzle/0000_workshop.sql`. В секретах Worker задайте `KW_OWNER_PASSWORD_HASH` (SHA-256 своего пароля в UTF-8, 64 строчных шестнадцатеричных символа) и `KW_SESSION_SECRET` (случайная строка длиной от 32 символов).

Адрес API задан в `assets/site-data.js` и `admin/owner.js`. Адрес публичной витрины задан в `admin/owner.js` и `backend/worker.mjs` и используется сервером при проверке Origin. Для проверки входа и публикации со своего компьютера укажите адрес своего тестового API в клиенте и задайте `KW_LOCAL_DEV=1` только у тестового Worker. Рабочие секреты и резервные копии базы хранятся отдельно от Git.
