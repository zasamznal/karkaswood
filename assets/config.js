// Адреса сервера и витрины собраны в одном месте.
// При переносе сайта на другой домен или сервер меняются только эти две строки
// (и константа SITE_URL в backend/worker.mjs — сервер сверяет по ней источник запросов).
export const PROD_API = 'https://karkaswood-barn-kosulino.fresh-book-1093.chatgpt.site/api';
export const SITE_URL = 'https://zasamznal.github.io/karkaswood/';

// Только при запуске на своём компьютере можно подменить сервер тестовым:
//   localStorage.setItem('kw:dev-api', 'http://127.0.0.1:8787/api')
// На опубликованном сайте подмена не работает, поэтому ссылкой её не включить.
function developmentApi() {
  if (!/^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return '';
  try {
    const value = localStorage.getItem('kw:dev-api') || '';
    return /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{2,5})?\/api$/.test(value) ? value : '';
  } catch { return ''; }
}

export const API_BASE = developmentApi() || PROD_API;
