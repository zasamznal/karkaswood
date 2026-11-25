const maxPhotoBytes = 150_000;
const maxEncodedLength = 4 * Math.ceil(maxPhotoBytes / 3);
const pngSignature = '\x89PNG\r\n\x1a\n';
const supportedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

function invalidPhoto(message = 'Выберите фотографию в формате JPEG, PNG или WebP.') {
  return Object.assign(new Error(message), {status: 400});
}

function decodePhoto(uri) {
  if (uri.length > maxEncodedLength + 23) {
    throw invalidPhoto('Размер фотографии должен быть не больше 150 000 байт.');
  }
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(uri);
  if (!match || match[2].length % 4 !== 0) throw invalidPhoto();
  let binary;
  try {
    binary = atob(match[2]);
  } catch {
    throw invalidPhoto();
  }
  if (binary.length > maxPhotoBytes) {
    throw invalidPhoto('Размер фотографии должен быть не больше 150 000 байт.');
  }
  const mime = match[1].toLowerCase();
  const signatureMatches = (mime === 'image/jpeg' && binary.startsWith('\xff\xd8\xff'))
    || (mime === 'image/png' && binary.startsWith(pngSignature))
    || (mime === 'image/webp' && binary.startsWith('RIFF') && binary.slice(8, 12) === 'WEBP');
  if (!signatureMatches) throw invalidPhoto();
  return {mime, bytes: Uint8Array.from(binary, char => char.charCodeAt(0))};
}

export async function storePhotos(db, items, baseOrigin) {
  const result = [];
  const pending = new Map();
  for (const item of items) {
    if (!/^data:/i.test(item.photo)) {
      result.push(item);
      continue;
    }
    const {mime, bytes} = decodePhoto(item.photo);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const hash = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
    pending.set(hash, {mime, bytes});
    result.push({...item, photo: new URL('/api/media/' + hash, baseOrigin).href});
  }
  if (pending.size) {
    const insert = db.prepare('INSERT OR IGNORE INTO kw_photos (hash, mime, bytes) VALUES (?, ?, ?)');
    const statements = Array.from(pending, ([hash, {mime, bytes}]) => insert.bind(hash, mime, bytes.buffer));
    await db.batch(statements);
  }
  return result;
}

export async function servePhoto(db, hash) {
  const row = typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash)
    ? await db.prepare('SELECT mime, bytes FROM kw_photos WHERE hash = ?').bind(hash).first()
    : null;
  if (!row || !supportedTypes.has(row.mime)) {
    return new Response(null, {status: 404, headers: {'Cache-Control': 'no-store'}});
  }
  return new Response(new Uint8Array(row.bytes), {headers: {
    'Content-Type': row.mime,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'ETag': '"' + hash + '"',
  }});
}
