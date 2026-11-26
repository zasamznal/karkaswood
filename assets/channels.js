// Способы связи с мастерской. Telegram в России работает с перебоями,
// поэтому звонок и СМС всегда идут рядом с мессенджерами.

const reservedTelegram = /^(?:addemoji|addlist|addstickers|addtheme|bg|boost|confirmphone|contact|folder|giftcode|invoice|joinchat|login|nft|proxy|setlanguage|share|socks|suggestedpost|tonsite)$/i;

export function telegramProfile(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(?:@?([a-z][a-z\d_]{3,30}[a-z\d])|(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([a-z][a-z\d_]{3,30}[a-z\d])\/?)$/i);
  if (!match) return null;
  const username = match[1] || match[2];
  return reservedTelegram.test(username) ? null : new URL('https://t.me/' + username);
}

export function normalizePhone(value) {
  if (typeof value !== 'string' || !/^\+?[\d\s().–-]+$/.test(value.trim())) return '';
  let digits = value.replace(/\D/g, '');
  if (!value.trim().startsWith('+')) {
    if (digits.length === 10) digits = '7' + digits;
    else if (/^[78]\d{10}$/.test(digits)) digits = '7' + digits.slice(1);
    else return '';
  }
  if (!/^[1-9]\d{6,14}$/.test(digits) || (digits[0] === '7' && digits.length !== 11)) return '';
  return '+' + digits;
}

export function formatPhone(phone) {
  return phone.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 $1 $2-$3-$4');
}

function hostedLink(value, hosts) {
  if (typeof value !== 'string' || !/^https:\/\//i.test(value) || /[\s\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    return !hosts || hosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host)) ? url : null;
  } catch { return null; }
}

function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@?&#%<>]+@[^\s@?&#%<>]+\.[^\s@?&#%<>]+$/u.test(value);
}

// Собирает всё, что владелец указал в настройках. Пустые и ошибочные значения отбрасываются.
export function getChannels(settings = {}) {
  const extra = settings.extra || {};
  const legal = settings.legal || {};
  const phone = normalizePhone(settings.phone || '');
  const whatsapp = normalizePhone(extra.whatsapp || '');
  const email = typeof legal.email === 'string' ? legal.email.trim() : '';
  return {
    phone,
    phoneLabel: phone ? formatPhone(phone) : '',
    telegram: telegramProfile(settings.telegram),
    channel: telegramProfile(settings.channel),
    max: hostedLink(extra.max, ['max.ru']),
    vk: hostedLink(extra.vk, ['vk.com', 'vk.ru']),
    whatsapp: whatsapp ? new URL('https://wa.me/' + whatsapp.slice(1)) : null,
    email: validEmail(email) ? email : '',
    mapUrl: hostedLink(extra.mapUrl),
    hours: typeof legal.hours === 'string' ? legal.hours.trim() : '',
    address: typeof legal.address === 'string' ? legal.address.trim() : '',
    contactName: typeof extra.contactName === 'string' ? extra.contactName.trim() : '',
  };
}
