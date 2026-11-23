const CONTENT_URL = 'https://karkaswood-barn-kosulino.fresh-book-1093.chatgpt.site/api/site';
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
  return new URLSearchParams(location.search).get('preview') === 'draft' ? readSaved(draftKey) : null;
}

async function getJson(url, signal) {
  const response = await fetch(url, {signal, credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer'});
  if (!response.ok) throw new Error('Каталог временно недоступен');
  const data = await response.json();
  if (!isSite(data)) throw new Error('Не удалось прочитать каталог');
  return data;
}

export async function loadPublicSite() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const live = await getJson(CONTENT_URL, controller.signal);
    try { localStorage.setItem(publicKey, JSON.stringify(live)); } catch { /* Storage can be full or disabled. */ }
    return live;
  } catch {
    return readSaved(publicKey) || await getJson(seedUrl);
  } finally { clearTimeout(timeout); }
}
