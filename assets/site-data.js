import { API_BASE } from './config.js';
import { normalizeSite, SCHEMA } from './site-defaults.js';

const CONTENT_URL = API_BASE + '/site';
const seedUrl = new URL('../data/site.json', import.meta.url);
const draftKey = 'kw:site-draft:v1';
const publicKey = 'kw:public-site:v2';

function isSite(input) {
  return input && typeof input.settings === 'object' && input.settings !== null && Array.isArray(input.items);
}

function readSaved(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return isSite(value) ? value : null;
  } catch { return null; }
}

export function getPreviewDraft() {
  if (new URLSearchParams(location.search).get('preview') !== 'draft') return null;
  const draft = readSaved(draftKey);
  return draft ? normalizeSite(draft) : null;
}

async function getJson(url, signal) {
  const response = await fetch(url, {signal, credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer'});
  if (!response.ok) throw new Error('Каталог временно недоступен');
  const data = await response.json();
  if (!isSite(data)) throw new Error('Не удалось прочитать каталог');
  return data;
}

// source: 'live' — ответ сервера, 'cache' — последняя успешная копия, 'seed' — стартовый каталог из репозитория.
// schema: версия данных, которую умеет хранить сервер. Стартовый каталог всегда полной версии.
export async function loadPublicSite() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const live = await getJson(CONTENT_URL, controller.signal);
    try { localStorage.setItem(publicKey, JSON.stringify(live)); } catch { /* Storage can be full or disabled. */ }
    return { ...normalizeSite(live), schema: Number(live.schema) || 1, source: 'live' };
  } catch {
    const cached = readSaved(publicKey);
    if (cached) return { ...normalizeSite(cached), schema: Number(cached.schema) || 1, source: 'cache' };
    const seed = await getJson(seedUrl);
    return { ...normalizeSite(seed), schema: SCHEMA, source: 'seed' };
  } finally { clearTimeout(timeout); }
}
