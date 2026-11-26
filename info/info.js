import { getPreviewDraft, loadPublicSite } from '../assets/site-data.js';
import { applySeason } from '../assets/season.js';
import { resolveTheme } from '../assets/site-defaults.js';
import { getChannels } from '../assets/channels.js';
import { brandNames, sellerLine } from '../assets/sections.js';

const forms = {
  ip: 'Индивидуальный предприниматель',
  ooo: 'Общество с ограниченной ответственностью',
  npd: 'Плательщик налога на профессиональный доход',
};
const clean = value => typeof value === 'string' ? value.trim() : '';

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

function render(settings) {
  const legal = settings.legal || {};
  const channels = getChannels(settings);
  const names = brandNames(settings);
  document.title = 'Информация для покупателей — ' + names.primary;
  document.querySelectorAll('[data-brand-ru]').forEach(node => { node.textContent = names.russian; node.hidden = !names.russian; });
  document.querySelectorAll('[data-brand]').forEach(node => { node.textContent = names.brand; node.hidden = names.russian === names.brand; });

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
  document.getElementById('legal-empty').hidden = legalList.childElementCount > 0;
  const owner = document.getElementById('owner-details');
  row(owner, 'Наименование или ФИО', clean(legal.ownerName));
  row(owner, 'Адрес владельца', clean(legal.ownerAddress));
  const ownerEmail = clean(legal.ownerEmail);
  if (/^[^\s@?&#%<>]+@[^\s@?&#%<>]+\.[^\s@?&#%<>]+$/u.test(ownerEmail)) row(owner, 'Почта для обращений, в том числе от правообладателей', link(ownerEmail, 'mailto:' + ownerEmail));
  document.getElementById('ownership').hidden = owner.childElementCount === 0;

  const contacts = document.getElementById('contacts');
  if (channels.contactName) row(contacts, 'Контактное лицо', channels.contactName);
  row(contacts, 'Место просмотра', clean(settings.location));
  row(contacts, 'Режим работы', channels.hours);
  if (channels.phone) row(contacts, 'Телефон', link(channels.phoneLabel, 'tel:' + channels.phone));
  if (channels.email) row(contacts, 'Электронная почта', link(channels.email, 'mailto:' + channels.email));
  if (channels.telegram) row(contacts, 'Telegram', link('@' + channels.telegram.pathname.slice(1), channels.telegram.href, true));
  if (channels.max) row(contacts, 'MAX', link('Написать в MAX', channels.max.href, true));
  if (channels.whatsapp) row(contacts, 'WhatsApp', link(channels.phoneLabel && channels.whatsapp.pathname.slice(1) === channels.phone.slice(1) ? channels.phoneLabel : '+' + channels.whatsapp.pathname.slice(1), channels.whatsapp.href, true));
  if (channels.vk) row(contacts, 'ВКонтакте', link('Страница мастерской', channels.vk.href, true));
  if (channels.channel) row(contacts, 'Канал мастерской', link('@' + channels.channel.pathname.slice(1), channels.channel.href, true));
  if (channels.mapUrl) row(contacts, 'На карте', link('Открыть карту', channels.mapUrl.href, true));
  const status = document.getElementById('load-status');
  if (contacts.childElementCount) status.hidden = true;
  else status.textContent = 'Контакты мастерской пока не опубликованы.';

  const request = document.getElementById('requisites-request');
  const question = 'Здравствуйте! Пришлите, пожалуйста, карточку с реквизитами для договора.';
  if (channels.telegram) {
    const chat = new URL(channels.telegram);
    chat.searchParams.set('text', question);
    request.href = chat.href;
    request.target = '_blank';
    request.rel = 'noopener noreferrer';
  } else if (channels.email) {
    request.href = 'mailto:' + channels.email + '?subject=' + encodeURIComponent('Запрос реквизитов');
  } else if (channels.phone) {
    request.href = 'tel:' + channels.phone;
  } else {
    request.parentElement.hidden = true;
  }

  // Оператор в политике и строка о продавце в подвале
  const seller = sellerLine(legal);
  if (seller) {
    const operator = document.getElementById('operator-line');
    const pieces = ['Оператор персональных данных — ' + seller.replace(/\.$/, '') + ' (далее — мастерская).'];
    if (clean(legal.address)) pieces.push('Адрес для обращений: ' + clean(legal.address) + '.');
    if (channels.email) pieces.push('Электронная почта: ' + channels.email + '.');
    if (channels.phone) pieces.push('Телефон: ' + channels.phoneLabel + '.');
    operator.textContent = pieces.join(' ');
  }
  document.getElementById('footer-owner').textContent = '© ' + new Date().getFullYear() + ' ' + names.primary + '.' + (seller ? ' ' + seller : '');
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
if (seasonOverride || draft) applySeason(draft ? resolveTheme(draft.settings) : seasonOverride);
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
  applySeason(draft ? resolveTheme(settings) : (seasonOverride || resolveTheme(settings)));
  render(settings);
} catch {
  document.getElementById('load-status').textContent = 'Не удалось загрузить контакты. Попробуйте обновить страницу.';
}
