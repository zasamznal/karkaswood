import seed from '../data/site.json' with { type: 'json' };
import {storePhotos, servePhoto} from './media.mjs';
import {legalValidationError} from '../assets/legal-validation.js';
import {tourTemplates} from '../assets/tour-registry.js';
import {SCHEMA, extraValidationError, itemExtraValidationError} from '../assets/site-defaults.js';

const SITE_URL = 'https://zasamznal.github.io/karkaswood/';
const PUBLIC_ORIGIN = new URL(SITE_URL).origin;
// Запрос может нести новые фотографии, поэтому он крупнее каталога, который остаётся в базе после их выноса в таблицу kw_photos.
const REQUEST_LIMIT = 2_500_000;
const DOCUMENT_LIMIT = 900_000;
const SESSION_SECONDS = 4 * 60 * 60;
const WINDOW_SECONDS = 10 * 60;
const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
const bytesFromHex = value => Uint8Array.from(value.match(/../g), pair => parseInt(pair, 16));
const isSha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const hash = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const asBytes = value => encoder.encode(value);
const seedDocument = JSON.stringify({settings: seed.settings, items: seed.items});
let seedHash;
const seedRevision = () => seedHash ??= hash(seedDocument);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const textField = (value, max) => typeof value === 'string' && value.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
const nonempty = (value, max) => textField(value, max) && value.trim().length > 0;
const allowedSettings = new Set(['brand','heading','intro','location','phone','telegram','channel','insideWidth','legal','theme','extra']);
const allowedFields = new Set(['id','category','name','summary','dimensions','price','source','photo','published','tourId','offerNote','included','clarify','badge','gallery']);
const categories = new Set(['utility','bath','cabin','house']);

class ApiError extends Error {
  constructor(status, message, fields = {}, headers = {}) {
    super(message);
    Object.assign(this, {status, fields, headers});
  }
}

function fail(status, message, fields, headers) {
  throw new ApiError(status, message, fields, headers);
}

function originAllowed(origin, url, env) {
  if (origin === PUBLIC_ORIGIN || origin === url.origin) return true;
  if (env.KW_LOCAL_DEV !== '1') return false;
  return /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin);
}

async function readJson(request, limit) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    fail(415, 'Отправьте JSON с типом application/json.');
  }
  if (Number(request.headers.get('content-length')) > limit) fail(413, 'Превышен допустимый размер данных.');
  if (!request.body) fail(400, 'Пустой запрос.');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const {value, done} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        fail(413, 'Превышен допустимый размер данных.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  try {
    return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(data));
  } catch {
    fail(400, 'Не удалось прочитать JSON.');
  }
}

function httpsLink(value) {
  if (!textField(value, 2048) || !/^https:\/\//i.test(value) || /[\s\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

function photoAllowed(value, ownOrigin) {
  if (!value || httpsLink(value)) return true;
  if (!textField(value, 201_000)) return false;
  if (value.startsWith(ownOrigin + '/api/media/') && /^[a-f0-9]{64}$/.test(value.slice((ownOrigin + '/api/media/').length))) return true;
  // storePhotos validates MIME, decoded size and the raster signature before writing.
  if (value.startsWith('data:')) return true;
  return value.length <= 2048 && /^assets\/[a-z\d_./-]+\.(?:jpe?g|png|webp|avif|gif)$/i.test(value)
    && !value.split('/').some(segment => segment === '..' || !segment);
}

function validateDocument(body, ownOrigin) {
  const settings = body?.settings;
  const items = body?.items;
  if (!isRecord(settings) || !Array.isArray(items) || items.length > 400) fail(400, 'Проверьте структуру каталога.');
  const legalError = legalValidationError(settings.legal);
  if (legalError) fail(400, legalError);
  const extraError = extraValidationError(settings.extra);
  if (extraError) fail(400, extraError);
  if (settings.theme !== undefined && !['classic', 'newyear'].includes(settings.theme)) fail(400, 'Выберите доступное оформление сайта.');
  if (Object.keys(settings).some(key => !allowedSettings.has(key))
    || !nonempty(settings.brand, 200) || !nonempty(settings.heading, 400) || !nonempty(settings.location, 400)
    || !textField(settings.intro, 3000) || !textField(settings.phone, 30) || (settings.phone && !/^\+[1-9]\d{6,14}$/.test(settings.phone))
    || ![settings.telegram, settings.channel].every(value => textField(value, 80) && (!value || /^https:\/\/t\.me\/[a-z][a-z\d_]{3,30}[a-z\d]$/i.test(value)))
    || !Number.isInteger(settings.insideWidth) || settings.insideWidth < 185 || settings.insideWidth > 240) {
    fail(400, 'Проверьте название, контакты и внутреннюю ширину в настройках.');
  }
  const ids = new Set();
  for (const item of items) {
    if (isRecord(item) && item.offerNote !== undefined && !textField(item.offerNote, 500)) {
      fail(400, 'Условия цены и комплектации должны быть текстом до 500 символов.');
    }
    if (isRecord(item) && item.tourId !== undefined
      && !(typeof item.tourId === 'string' && (item.tourId === 'none' || Object.hasOwn(tourTemplates, item.tourId)))) {
      fail(400, 'Выберите 3D-тур из списка или скройте тур для этой карточки.');
    }
    const itemError = isRecord(item) ? itemExtraValidationError(item) : '';
    if (itemError) fail(400, itemError);
    if (isRecord(item) && Array.isArray(item.gallery) && !item.gallery.every(photo => photoAllowed(photo, ownOrigin))) {
      fail(400, 'Проверьте дополнительные фотографии карточки.');
    }
    if (!isRecord(item) || Object.keys(item).some(key => !allowedFields.has(key))
      || !textField(item.id, 120) || !/^[a-z\d][a-z\d_-]*$/i.test(item.id) || ids.has(item.id)
      || !categories.has(item.category) || !nonempty(item.name, 120) || !textField(item.dimensions, 80)
      || !textField(item.summary, 1200) || typeof item.published !== 'boolean'
      || (item.price != null && (!Number.isSafeInteger(item.price) || item.price < 1))
      || !textField(item.source, 2048) || (item.source && !httpsLink(item.source))
      || typeof item.photo !== 'string' || !photoAllowed(item.photo, ownOrigin)) {
      fail(400, 'Проверьте поля карточек, уникальность идентификаторов, фотографии и HTTPS-ссылки.');
    }
    ids.add(item.id);
  }
  return {settings, items};
}

async function signingKey(env) {
  if (!isSha(env.KW_OWNER_PASSWORD_HASH) || typeof env.KW_SESSION_SECRET !== 'string' || env.KW_SESSION_SECRET.length < 32) {
    fail(503, 'Вход владельца пока не настроен.');
  }
  // Changing the password hash or signing secret invalidates existing sessions.
  return crypto.subtle.importKey('raw', asBytes('karkaswood-owner:v1:' + env.KW_SESSION_SECRET + ':' + env.KW_OWNER_PASSWORD_HASH),
    {name:'HMAC', hash:'SHA-256'}, false, ['sign','verify']);
}

async function login(request, env, db) {
  const input = await readJson(request, 2048);
  if (!nonempty(input?.password, 256)) fail(400, 'Введите пароль владельца.');
  const key = await signingKey(env);
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / WINDOW_SECONDS);
  // Cloudflare supplies this header. Store only a rotating, keyed, bounded bucket.
  const peer = request.headers.get('cf-connecting-ip') || 'unavailable';
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, asBytes('limit:' + window + ':' + peer)));
  const slot = (digest[0] << 8) | digest[1];
  const updated = await db.prepare(
    'INSERT INTO kw_login_limits (slot, window, attempts) VALUES (?, ?, 1) ' +
    'ON CONFLICT(slot) DO UPDATE SET window = excluded.window, ' +
    'attempts = CASE WHEN kw_login_limits.window = excluded.window THEN kw_login_limits.attempts + 1 ELSE 1 END ' +
    'WHERE kw_login_limits.window <> excluded.window OR kw_login_limits.attempts < 8'
  ).bind(slot, window).run();
  if (updated.meta.changes !== 1) {
    fail(429, 'Слишком много попыток. Попробуйте позже.', {}, {'Retry-After':String((window + 1) * WINDOW_SECONDS - now)});
  }
  const expected = await crypto.subtle.sign('HMAC', key, asBytes(env.KW_OWNER_PASSWORD_HASH));
  const passwordDigest = await hash(input.password);
  if (!await crypto.subtle.verify('HMAC', key, expected, asBytes(passwordDigest))) fail(401, 'Неверный пароль владельца.');
  const expiresAt = now + SESSION_SECONDS;
  const nonce = hex(crypto.getRandomValues(new Uint8Array(16)));
  const payload = ['v1', expiresAt, nonce].join('.');
  const signature = hex(await crypto.subtle.sign('HMAC', key, asBytes('session:' + payload)));
  return {token: payload + '.' + signature, expiresAt};
}

async function requireSession(request, env) {
  const key = await signingKey(env);
  const match = /^Bearer (v1\.(\d{10})\.[a-f0-9]{32})\.([a-f0-9]{64})$/.exec(request.headers.get('authorization') || '');
  const now = Math.floor(Date.now() / 1000);
  if (!match || +match[2] <= now || +match[2] > now + SESSION_SECONDS
    || !await crypto.subtle.verify('HMAC', key, bytesFromHex(match[3]), asBytes('session:' + match[1]))) {
    fail(401, 'Войдите в кабинет владельца.');
  }
}

async function readSite(db, isAdmin) {
  const row = await db.prepare('SELECT sha, document FROM kw_site WHERE id = 1').first();
  const {settings, items} = row ? JSON.parse(row.document) : seed;
  // schema сообщает панели, что сервер хранит расширенные поля: тексты сайта, галереи и комплектацию карточек.
  return {settings, items: isAdmin ? items : items.filter(item => item.published === true && item.visible !== false), sha: row?.sha || await seedRevision(), schema: SCHEMA};
}

async function saveSite(request, db) {
  const input = await readJson(request, REQUEST_LIMIT);
  if (!isSha(input?.baseSha)) fail(400, 'Отсутствует исходная ревизия. Заново откройте кабинет.');
  const ownOrigin = new URL(request.url).origin;
  const site = validateDocument(input, ownOrigin);
  const initial = await seedRevision();
  async function currentSha() {
    return (await db.prepare('SELECT sha FROM kw_site WHERE id = 1').first())?.sha || initial;
  }
  function conflict(sha) {
    fail(409, 'Сайт уже изменился. Загрузите актуальную версию перед публикацией.', {sha});
  }
  const base = await currentSha();
  if (base !== input.baseSha) conflict(base);
  try {
    site.items = await storePhotos(db, site.items, ownOrigin);
  } catch (error) {
    if (error.status === 400) fail(400, 'Не удалось прочитать загруженную фотографию.');
    throw error;
  }
  const document = JSON.stringify(site);
  if (asBytes(document).length > DOCUMENT_LIMIT) fail(413, 'Каталог получился слишком большим. Сократите тексты или число карточек.');
  const sha = await hash(document);
  // This single SQLite statement checks the revision and writes on the primary atomically,
  // including the first edit of the embedded seed (no row yet).
  const result = await db.prepare(
    'INSERT INTO kw_site (id, sha, document) SELECT 1, ?, ? ' +
    'WHERE ? = COALESCE((SELECT sha FROM kw_site WHERE id = 1), ?) ' +
    'ON CONFLICT(id) DO UPDATE SET sha = excluded.sha, document = excluded.document'
  ).bind(sha, document, input.baseSha, initial).run();
  if (result.meta.changes !== 1) conflict(await currentSha());
  return {sha, commit: sha, url: SITE_URL, schema: SCHEMA};
}

const methods = new Map([['/api/site', ['GET']], ['/api/login', ['POST']], ['/api/admin/site', ['GET','PUT']]]);
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    const headers = new Headers({'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'});
    try {
      if (origin && !originAllowed(origin, url, env)) fail(403, 'Недопустимый источник запроса.');
      if (origin) headers.set('Access-Control-Allow-Origin', origin);
      if (url.pathname === '/' && ['GET','HEAD'].includes(request.method)) return Response.redirect(SITE_URL, 302);
      const media = /^\/api\/media\/([a-f0-9]{64})$/.exec(url.pathname);
      const allowed = media ? ['GET','HEAD'] : methods.get(url.pathname);
      if (!allowed) fail(404, 'Страница не найдена.');
      if (request.method === 'OPTIONS') {
        headers.set('Access-Control-Allow-Methods', allowed.join(', '));
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        headers.set('Access-Control-Max-Age', '600');
        return new Response(null, {status:204, headers});
      }
      if (!allowed.includes(request.method)) fail(405, 'Метод не поддерживается.', {}, {Allow: allowed.join(', ')});
      if (['POST','PUT'].includes(request.method) && !origin) fail(403, 'Не указан источник запроса.');
      if (!env.DB) fail(503, 'Хранилище сайта недоступно.');
      const db = env.DB.withSession ? env.DB.withSession('first-primary') : env.DB;
      if (media) {
        const photo = await servePhoto(db, media[1]);
        const mediaHeaders = new Headers(photo.headers);
        mediaHeaders.delete('Access-Control-Allow-Origin');
        if (origin) mediaHeaders.set('Access-Control-Allow-Origin', origin);
        mediaHeaders.set('Vary','Origin');
        mediaHeaders.set('X-Content-Type-Options','nosniff');
        return new Response(request.method === 'HEAD' ? null : photo.body, {status:photo.status, headers:mediaHeaders});
      }
      let result;
      if (url.pathname === '/api/login') result = await login(request, env, db);
      else {
        const isAdmin = url.pathname === '/api/admin/site';
        if (isAdmin) await requireSession(request, env);
        result = request.method === 'PUT' ? await saveSite(request, db) : await readSite(db, isAdmin);
      }
      return Response.json(result, {headers});
    } catch (error) {
      const expected = error instanceof ApiError;
      if (expected) for (const [key, value] of Object.entries(error.headers)) headers.set(key, value);
      return Response.json({error: expected ? error.message : 'Сервис временно недоступен.', ...(expected ? error.fields : {})},
        {status: expected ? error.status : 503, headers});
    }
  }
};
