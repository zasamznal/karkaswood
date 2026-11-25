// Самопроверка сервера через его HTTP-интерфейс. Запуск: в одном окне `npm run dev:api`, в другом `npm run test:api`.
// Проверяет вход, публикацию расширенных полей, вынос фотографий, конфликт версий и отказ на неверные данные.
const API = 'http://127.0.0.1:8787/api', ORIGIN = 'http://127.0.0.1:8000';
const call = async (path, method = 'GET', body, token) => {
  const r = await fetch(API + path, { method, headers: { Origin: ORIGIN, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null), headers: r.headers };
};
const ok = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' ' + extra)); if (!cond) process.exitCode = 1; };
const pub = await call('/site');
ok('public site answers with schema 2', pub.status === 200 && pub.json.schema === 2 && pub.json.items.length === 10, JSON.stringify(pub.json).slice(0, 200));
ok('CORS allows local origin', pub.headers.get('access-control-allow-origin') === ORIGIN);
const bad = await call('/login', 'POST', { password: 'wrong' });
ok('wrong password rejected', bad.status === 401);
const login = await call('/login', 'POST', { password: 'demo' });
ok('login works', login.status === 200 && /^v1\./.test(login.json.token));
const token = login.json.token;
const unauth = await call('/admin/site');
ok('admin requires session', unauth.status === 401);
const admin = await call('/admin/site', 'GET', undefined, token);
ok('admin load', admin.status === 200 && /^[a-f0-9]{64}$/.test(admin.json.sha));
// 1x1 webp
const webp = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
const doc = structuredClone({ settings: admin.json.settings, items: admin.json.items });
doc.settings.extra = { brandRu: 'Каркасвуд', contactName: 'Дмитрий', themeMode: 'auto', notice: 'Принимаем заказы', faq: [{ q: 'Вопрос?', a: 'Ответ.' }], facts: [{ title: 'Факт', text: '' }] };
doc.settings.legal = { form: 'ip', name: 'Иванов Иван Иванович', inn: '500100732259', ogrn: '', address: '', email: '' };
doc.items[1] = { ...doc.items[1], included: ['Пункт один', 'Пункт два'], clarify: 'Уточнить', badge: 'stock', gallery: [webp, 'assets/project-photos/scandinavia-3-5-sauna.webp'] };
const put = await call('/admin/site', 'PUT', { ...doc, baseSha: admin.json.sha }, token);
ok('publish extended document', put.status === 200 && put.json.schema === 2, JSON.stringify(put.json));
const again = await call('/site');
const item = again.json.items[1];
ok('extra stored', again.json.settings.extra.notice === 'Принимаем заказы' && item.badge === 'stock' && item.included.length === 2);
ok('gallery upload moved to media', /^http:\/\/127\.0\.0\.1:8787\/api\/media\/[a-f0-9]{64}$/.test(item.gallery[0]) && item.gallery[1].startsWith('assets/'), JSON.stringify(item.gallery));
const media = await fetch(item.gallery[0]);
ok('media served', media.status === 200 && media.headers.get('content-type') === 'image/webp');
const stale = await call('/admin/site', 'PUT', { ...doc, baseSha: admin.json.sha }, token);
ok('stale revision conflicts', stale.status === 409);
const invalid = structuredClone(doc); invalid.settings.extra.max = 'https://evil.example/x';
const rej = await call('/admin/site', 'PUT', { ...invalid, baseSha: put.json.sha }, token);
ok('bad MAX link rejected', rej.status === 400, JSON.stringify(rej.json));
const invalid2 = structuredClone(doc); invalid2.items[0].badge = 'sale';
ok('unknown badge rejected', (await call('/admin/site', 'PUT', { ...invalid2, baseSha: put.json.sha }, token)).status === 400);
const invalid3 = structuredClone(doc); invalid3.settings.legal.inn = '500100732250';
ok('bad INN checksum rejected', (await call('/admin/site', 'PUT', { ...invalid3, baseSha: put.json.sha }, token)).status === 400);
const foreign = await fetch(API + '/site', { headers: { Origin: 'https://evil.example' } });
ok('foreign origin forbidden', foreign.status === 403);
// restore seed-like state for browser tests
const fresh = await call('/admin/site', 'GET', undefined, token);
const reset = await call('/admin/site', 'PUT', { settings: admin.json.settings, items: admin.json.items, baseSha: fresh.json.sha }, token);
ok('restore original', reset.status === 200);
