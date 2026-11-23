const API = 'https://karkaswood-barn-kosulino.fresh-book-1093.chatgpt.site/api';
const SITE_URL = 'https://zasamznal.github.io/karkaswood/';
const MAX_BYTES = 850_000;
const isRevision = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const error = (code, message, status = 0) => Object.assign(new Error(message), {code, status});

function tooLarge(status = 0) {
  return error('size', 'Каталог вместе с фотографиями должен занимать до 850 КБ. Уменьшите фотографии или укажите ссылки на них.', status);
}

function httpError(status, login) {
  if (status === 401) return error('auth', login ? 'Пароль не подошёл. Проверьте раскладку и попробуйте ещё раз.' : 'Время сеанса истекло. Войдите снова.', status);
  if (status === 403) return error('forbidden', 'Сервер отказал в доступе. Откройте панель управления с сайта мастерской.', status);
  if (status === 409) return error('conflict', 'Каталог уже изменился. Сохраните свой текст, загрузите свежую версию и перенесите правки.', status);
  if (status === 413) return tooLarge(status);
  if (status === 400 || status === 422) return error('validation', login ? 'Проверьте введённый пароль мастерской.' : 'Сервер отклонил данные. Проверьте заполненные поля.', status);
  if (status === 429) return error('rate-limit', 'Слишком много запросов. Подождите и попробуйте снова.', status);
  return error('server', 'Сервис мастерской временно недоступен. Попробуйте позже.', status);
}

function validateDocument(doc) {
  if (!doc?.settings || typeof doc.settings !== 'object' || Array.isArray(doc.settings) || !Array.isArray(doc.items)) {
    throw error('validation', 'Для публикации нужны настройки сайта и список карточек.');
  }
}

async function request(path, method, {token, body, signal} = {}) {
  const headers = {Accept: 'application/json'};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(API + path, {
      method, headers, body, signal,
      credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
    });
  } catch {
    if (signal?.aborted) throw error('auth', 'Вы вышли из панели управления.');
    throw error('network', method === 'PUT'
      ? 'Ответ сервера не получен. Проверьте текущий каталог перед повторной публикацией.'
      : 'Не удалось связаться с сервисом мастерской. Проверьте подключение к интернету.');
  }
  if (!response.ok) throw httpError(response.status, path === '/login');
  try {
    return await response.json();
  } catch {
    if (signal?.aborted) throw error('auth', 'Вы вышли из панели управления.');
    throw error('response', 'Сервис мастерской вернул неполный ответ. Загрузите текущую версию каталога.');
  }
}

export async function connectOwner(password) {
  if (typeof password !== 'string' || !password.length) throw error('auth', 'Введите пароль мастерской.');
  if (password.length > 256) throw error('validation', 'Пароль мастерской может содержать до 256 символов.');
  const login = await request('/login', 'POST', {body: JSON.stringify({password})});
  if (typeof login?.token !== 'string' || !/^[A-Za-z0-9._~+/=-]+$/.test(login.token)) {
    throw error('response', 'Сервис мастерской не подтвердил вход. Попробуйте снова.');
  }
  return ownerSession(login.token);
}

function ownerSession(token) {
  const controller = new AbortController();
  function logout() {
    token = '';
    controller.abort();
  }

  async function siteRequest(method, body) {
    if (!token) throw error('auth', 'Войдите в панель управления снова.');
    try {
      return await request('/admin/site', method, {token, body, signal: controller.signal});
    } catch (cause) {
      if (cause.status === 401) logout();
      throw cause;
    }
  }

  return {
    username: 'Владелец',
    logout,
    async load() {
      const doc = await siteRequest('GET');
      if (!isRevision(doc?.sha)) throw error('response', 'Не удалось узнать версию каталога. Обновите страницу.');
      validateDocument(doc);
      return {settings: doc.settings, items: doc.items, sha: doc.sha};
    },
    async publish(doc, baseSha) {
      if (!isRevision(baseSha)) throw error('conflict', 'Загрузите текущую версию каталога перед публикацией.');
      validateDocument(doc);
      const body = JSON.stringify({settings: doc.settings, items: doc.items, baseSha});
      if (new TextEncoder().encode(body).length > MAX_BYTES) throw tooLarge();
      const result = await siteRequest('PUT', body);
      if (!isRevision(result?.sha) || !isRevision(result.commit) || result.url !== SITE_URL) {
        throw error('response', 'Сервер не подтвердил версию публикации. Проверьте текущий каталог перед повторной отправкой.');
      }
      return {sha: result.sha, commit: result.commit, url: SITE_URL};
    },
  };
}
