import { getPreviewDraft, loadPublicSite } from '../assets/site-data.js';
import { applySeason } from '../assets/season.js';

const forms = {
  ip: 'Индивидуальный предприниматель',
  ooo: 'Общество с ограниченной ответственностью',
  npd: 'Плательщик налога на профессиональный доход',
};
const clean = value => typeof value === 'string' ? value.trim() : '';

function telegramUrl(value) {
  const match = /^https:\/\/t\.me\/([a-z][a-z\d_]{3,30}[a-z\d])\/?$/i.exec(clean(value));
  if (!match) return null;
  const reserved = new Set(['addlist','addstickers','boost','contact','invoice','joinchat','login','proxy','share','socks']);
  return reserved.has(match[1].toLowerCase()) ? null : new URL('https://t.me/' + match[1]);
}

function link(label, href, external = false) {
  const anchor = document.createElement('a');
  anchor.textContent = label;
  anchor.href = href;
  if (external) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
  return anchor;
}

function row(list, label, content) {
  if (!content) return;
  const container = document.createElement('div');
  const term = document.createElement('dt');
  const definition = document.createElement('dd');
  term.textContent = label;
  definition.append(content);
  container.append(term, definition);
  list.append(container);
  list.hidden = false;
}

function validEmail(value) {
  return value.length <= 254 && /^[^\s@?&#%<>]+@[^\s@?&#%<>]+\.[^\s@?&#%<>]+$/u.test(value);
}

function render(settings) {
  const legal = settings.legal || {};
  const brand = clean(settings.brand);
  if (brand) {
    document.title = 'Информация для покупателей — ' + brand;
    document.querySelectorAll('[data-brand]').forEach(node => { node.textContent = brand; });
  }

  const legalList = document.getElementById('legal-details');
  const form = Object.hasOwn(forms, legal.form) ? legal.form : '';
  if (form) row(legalList, 'Статус', forms[form]);
  row(legalList, form === 'ooo' ? 'Полное наименование' : form === 'ip' || form === 'npd' ? 'Фамилия, имя, отчество' : 'Наименование или ФИО', clean(legal.name));
  row(legalList, 'ИНН', clean(legal.inn));
  if (form !== 'npd' && clean(legal.ogrn)) {
    row(legalList, form === 'ip' || String(legal.ogrn).length === 15 ? 'ОГРНИП' : 'ОГРН', clean(legal.ogrn));
  }
  if (form !== 'npd') row(legalList, 'Регистрирующий орган', clean(legal.regAuthority));
  row(legalList, 'Адрес для обращений', clean(legal.address));
  const owner = document.getElementById('owner-details');
  row(owner, 'Наименование или ФИО', clean(legal.ownerName));
  row(owner, 'Адрес владельца', clean(legal.ownerAddress));
  const ownerEmail = clean(legal.ownerEmail);
  if (validEmail(ownerEmail)) row(owner, 'Почта для обращений, в том числе от правообладателей', link(ownerEmail, 'mailto:' + ownerEmail));
  document.getElementById('ownership').hidden = owner.childElementCount === 0;

  const contacts = document.getElementById('contacts');
  row(contacts, 'Место просмотра', clean(settings.location));
  row(contacts, 'Режим работы', clean(legal.hours));
  const phone = clean(settings.phone);
  if (/^\+[1-9]\d{6,14}$/.test(phone)) {
    const display = phone.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 $1 $2-$3-$4');
    row(contacts, 'Телефон', link(display, 'tel:' + phone));
  }
  const email = clean(legal.email);
  const emailSafe = validEmail(email);
  if (emailSafe) row(contacts, 'Электронная почта', link(email, 'mailto:' + email));
  const chat = telegramUrl(settings.telegram);
  const channel = telegramUrl(settings.channel);
  if (chat) row(contacts, 'Telegram', link('@' + chat.pathname.slice(1), chat.href, true));
  if (channel) row(contacts, 'Канал мастерской', link('@' + channel.pathname.slice(1), channel.href, true));
  const status = document.getElementById('load-status');
  if (contacts.childElementCount) status.hidden = true;
  else status.textContent = 'Контакты мастерской пока не опубликованы.';

  const request = document.getElementById('requisites-request');
  if (chat) {
    chat.searchParams.set('text', 'Здравствуйте! Пришлите, пожалуйста, карточку предприятия с реквизитами для договора.');
    request.href = chat.href;
    request.target = '_blank';
    request.rel = 'noopener noreferrer';
  } else if (emailSafe) {
    request.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Запрос реквизитов');
  } else if (/^\+[1-9]\d{6,14}$/.test(phone)) {
    request.href = 'tel:' + phone;
  } else {
    request.parentElement.hidden = true;
  }
}

function updateAnchor() {
  const chosen = location.hash || '#details';
  document.querySelectorAll('.toc a').forEach(anchor => {
    if (anchor.hash === chosen) anchor.setAttribute('aria-current','location');
    else anchor.removeAttribute('aria-current');
  });
}
window.addEventListener('hashchange', updateAnchor);
updateAnchor();
const params = new URLSearchParams(location.search);
const wantsDraft = params.get('preview') === 'draft';
const requestedSeason = params.get('season');
const seasonOverride = ['classic', 'newyear'].includes(requestedSeason) ? requestedSeason : null;
const draft = getPreviewDraft();
if (draft) document.getElementById('draft').hidden = false;
if (seasonOverride || draft) applySeason(draft ? draft.settings.theme : seasonOverride);
if (wantsDraft || seasonOverride) {
  for (const anchor of document.querySelectorAll('[data-main]')) {
    const url = new URL(anchor.href);
    if (wantsDraft) url.searchParams.set('preview', 'draft');
    if (seasonOverride) url.searchParams.set('season', seasonOverride);
    anchor.href = url.href;
  }
}
try {
  const {settings} = draft || await loadPublicSite();
  applySeason(draft ? settings.theme : (seasonOverride || settings.theme));
  render(settings);
} catch {
  document.getElementById('load-status').textContent = 'Не удалось загрузить контакты. Попробуйте обновить страницу.';
}
