// Локальный сервер для проверки панели без Cloudflare: тот же backend/worker.mjs поверх SQLite из Node.js 22+.
//
//   node backend/dev-server.mjs              — пароль владельца «demo», база в памяти
//   KW_DEV_PASSWORD=секрет KW_DEV_DB=./dev.sqlite PORT=8787 node backend/dev-server.mjs
//
// Затем на странице http://127.0.0.1:8000/admin/ выполните в консоли браузера:
//   localStorage.setItem('kw:dev-api', 'http://127.0.0.1:8787/api'); location.reload();
// Для боевого сайта этот файл не нужен: там работает Cloudflare Worker с базой D1.
import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './worker.mjs';

const port = Number(process.env.PORT) || 8787;
const password = process.env.KW_DEV_PASSWORD || 'demo';
const sqlite = new DatabaseSync(process.env.KW_DEV_DB || ':memory:');

if (!sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'kw_site'").get()) {
  const schema = readFileSync(new URL('../drizzle/0000_workshop.sql', import.meta.url), 'utf8');
  for (const part of schema.split('--> statement-breakpoint')) if (part.trim()) sqlite.exec(part);
}

// Небольшая часть интерфейса D1, которой пользуется сервер: prepare → bind → first / run и batch.
function statement(sql, values = []) {
  const args = values.map(value => value instanceof ArrayBuffer ? new Uint8Array(value) : value);
  return {
    bind: (...next) => statement(sql, next),
    async first() { return sqlite.prepare(sql).get(...args) ?? null; },
    async all() { return { results: sqlite.prepare(sql).all(...args) }; },
    async run() {
      const result = sqlite.prepare(sql).run(...args);
      return { success: true, meta: { changes: Number(result.changes) } };
    },
  };
}
const DB = {
  prepare: sql => statement(sql),
  async batch(statements) {
    const results = [];
    for (const item of statements) results.push(await item.run());
    return results;
  },
};

const env = {
  DB,
  KW_LOCAL_DEV: '1',
  KW_OWNER_PASSWORD_HASH: createHash('sha256').update(password, 'utf8').digest('hex'),
  KW_SESSION_SECRET: process.env.KW_SESSION_SECRET || randomBytes(32).toString('hex'),
};

http.createServer(async (incoming, outgoing) => {
  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) if (typeof value === 'string') headers.set(name, value);
  const hasBody = !['GET', 'HEAD'].includes(incoming.method);
  const request = new Request(`http://127.0.0.1:${port}${incoming.url}`, {
    method: incoming.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined,
  });
  let response;
  try {
    response = await worker.fetch(request, env);
  } catch (error) {
    console.error(error);
    response = new Response('Internal error', { status: 500 });
  }
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, '127.0.0.1', () => {
  console.log(`Тестовый сервер: http://127.0.0.1:${port}/api · пароль владельца: ${password}`);
});
