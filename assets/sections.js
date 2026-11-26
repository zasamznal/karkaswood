import { getChannels } from './channels.js';

const svgNS = 'http://www.w3.org/2000/svg';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function icon(id) {
  const svg = document.createElementNS(svgNS, 'svg'), use = document.createElementNS(svgNS, 'use');
  svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', '#i-' + id); svg.append(use);
  return svg;
}

function outLink(label, url) {
  const link = el('a', '', label);
  link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.append(icon('out'));
  return link;
}

const clean = value => typeof value === 'string' ? value.trim() : '';
const pairs = (list, a, b) => (Array.isArray(list) ? list : [])
  .map(entry => [clean(entry?.[a]), clean(entry?.[b])]).filter(([first]) => first);

// Строка о продавце для подвала: её требует статья 9 закона о защите прав потребителей.
export function sellerLine(legal = {}) {
  const name = clean(legal.name), inn = clean(legal.inn), ogrn = clean(legal.ogrn);
  if (!name && !inn) return '';
  const parts = [];
  if (name) parts.push(legal.form === 'ip' && !/^ИП\s|предприниматель/i.test(name) ? 'ИП ' + name : name);
  if (legal.form === 'npd') parts.push('плательщик налога на профессиональный доход');
  if (inn) parts.push('ИНН ' + inn);
  if (ogrn && legal.form !== 'npd') parts.push((ogrn.length === 15 ? 'ОГРНИП ' : 'ОГРН ') + ogrn);
  return parts.join(', ') + '.';
}

export function brandNames(settings) {
  const brand = clean(settings.brand) || 'Karkaswood';
  const russian = clean(settings.extra?.brandRu);
  return { brand, russian, primary: russian || brand, full: russian && russian !== brand ? russian + ' (' + brand + ')' : brand };
}

function setMeta(selector, value) {
  const node = document.querySelector(selector);
  if (node && value) node.setAttribute('content', value);
}

export function renderSections(settings) {
  const extra = settings.extra || {};
  const channels = getChannels(settings);
  const names = brandNames(settings);

  // Объявление над шапкой
  const notice = document.querySelector('#site-notice');
  if (notice) {
    notice.hidden = !clean(extra.notice);
    notice.querySelector('p').textContent = clean(extra.notice);
  }

  // Название
  for (const brand of document.querySelectorAll('.brand')) {
    const russian = brand.querySelector('[data-brand-ru]'), latin = brand.querySelector('[data-brand]');
    if (russian) { russian.textContent = names.russian; russian.hidden = !names.russian; }
    if (latin) { latin.textContent = names.brand; latin.hidden = Boolean(names.russian) && names.russian === names.brand; }
    brand.setAttribute('aria-label', names.primary + ', в начало');
  }
  const heading = clean(settings.heading);
  document.title = clean(extra.seoTitle) || names.full + (heading ? ' — ' + heading : '');
  const description = clean(extra.seoDescription);
  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:title"]', clean(extra.seoTitle) || names.primary + (heading ? ' — ' + heading : ''));
  setMeta('meta[property="og:site_name"]', names.primary);

  // О мастерской
  const about = document.querySelector('#workshop');
  if (about) {
    const text = about.querySelector('#about-text'), list = about.querySelector('#facts-list');
    const facts = pairs(extra.facts, 'title', 'text');
    text.textContent = clean(extra.about); text.hidden = !text.textContent;
    list.replaceChildren(...facts.map(([title, body]) => {
      const item = el('li');
      item.append(icon('check'), el('h3', '', title));
      if (body) item.append(el('p', '', body));
      return item;
    }));
    list.hidden = !facts.length;
    about.hidden = text.hidden && list.hidden;
  }

  // Из чего строят
  const materials = document.querySelector('#materials');
  if (materials) {
    const rows = pairs(extra.materials, 'title', 'text');
    materials.querySelector('#materials-list').replaceChildren(...rows.map(([title, body]) => {
      const row = el('div');
      row.append(el('dt', '', title), el('dd', '', body));
      return row;
    }));
    materials.hidden = !rows.length;
  }

  // Вопросы и ответы
  const faq = document.querySelector('#faq');
  if (faq) {
    const questions = pairs(extra.faq, 'q', 'a').filter(([, answer]) => answer);
    faq.querySelector('#faq-list').replaceChildren(...questions.map(([question, answer]) => {
      const item = el('details', 'faq-item'), summary = el('summary');
      summary.append(el('span', '', question), icon('plus'));
      item.append(summary, el('div', 'faq-answer', answer));
      return item;
    }));
    faq.hidden = !questions.length;
    for (const link of document.querySelectorAll('[data-faq-nav]')) link.hidden = faq.hidden;
  }

  // Телефон
  for (const link of document.querySelectorAll('[data-phone]')) {
    link.hidden = !channels.phone;
    if (!channels.phone) continue;
    link.href = 'tel:' + channels.phone;
    const label = link.querySelector('[data-phone-text]');
    if (label) label.textContent = channels.phoneLabel;
    else link.setAttribute('aria-label', 'Позвонить в мастерскую: ' + channels.phoneLabel);
  }

  // Контакты
  const facts = document.querySelector('#visit-facts');
  if (facts) {
    const rows = [];
    function row(glyph, label, content) {
      if (!content) return;
      const line = el('div'), value = el('dd');
      value.append(content);
      line.append(icon(glyph), el('dt', '', label), value);
      rows.push(line);
    }
    if (channels.contactName) row('message', 'Кто ответит', channels.contactName + ' — на связи по телефону и в мессенджерах');
    row('clock', 'Режим работы', channels.hours);
    const place = channels.address || clean(settings.location);
    if (place) {
      const value = document.createDocumentFragment();
      value.append(place);
      if (channels.mapUrl) {
        const map = el('a', '', 'Показать на карте');
        map.href = channels.mapUrl.href; map.target = '_blank'; map.rel = 'noopener noreferrer';
        value.append(' · ', map);
      }
      row('pin', 'Адрес', value);
    }
    if (channels.email) {
      const mail = el('a', '', channels.email);
      mail.href = 'mailto:' + channels.email;
      row('mail', 'Электронная почта', mail);
    }
    facts.replaceChildren(...rows);
  }
  const links = document.querySelector('#visit-links');
  if (links) {
    const list = [];
    if (channels.channel) list.push(outLink('Канал в Telegram', channels.channel));
    if (channels.max) list.push(outLink('MAX', channels.max));
    if (channels.vk) list.push(outLink('ВКонтакте', channels.vk));
    links.replaceChildren(...list);
  }
  const channelLink = document.querySelector('[data-channel]');
  if (channelLink) {
    channelLink.hidden = !channels.channel;
    if (channels.channel) channelLink.href = channels.channel.href;
  }

  // Подвал
  const owner = document.querySelector('#footer-owner');
  if (owner) {
    const seller = sellerLine(settings.legal);
    owner.textContent = '© ' + new Date().getFullYear() + ' ' + names.primary + '.' + (seller ? ' ' + seller : '');
  }

  // Нижняя панель связи на телефонах
  const dock = document.querySelector('#contact-dock');
  if (dock) {
    const reachable = Boolean(channels.phone || channels.telegram || channels.max || channels.whatsapp);
    dock.hidden = !reachable;
    document.documentElement.classList.toggle('kw-has-dock', reachable);
    if (reachable && typeof IntersectionObserver === 'function' && !dock.dataset.watched) {
      dock.dataset.watched = '';
      const targets = [document.querySelector('#visit'), document.querySelector('.footer')].filter(Boolean);
      const visible = new Set();
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
        dock.toggleAttribute('data-away', visible.size > 0);
      }, { threshold: .2 });
      targets.forEach(target => observer.observe(target));
    }
  }

  // Сведения об организации для поисковых систем
  const [locality, region] = clean(settings.location).split(',').map(part => part.trim());
  const data = {
    '@context': 'https://schema.org', '@type': 'HomeAndConstructionBusiness',
    name: names.primary, url: location.origin + location.pathname,
    description: clean(extra.about) || clean(settings.intro) || undefined,
    alternateName: names.russian && names.russian !== names.brand ? names.brand : undefined,
    telephone: channels.phone || undefined, email: channels.email || undefined,
    openingHours: undefined,
    address: locality ? { '@type': 'PostalAddress', addressCountry: 'RU', addressRegion: region || undefined,
      addressLocality: locality, streetAddress: channels.address || undefined } : undefined,
    sameAs: [channels.channel, channels.vk, channels.max].filter(Boolean).map(url => url.href),
  };
  let script = document.querySelector('#kw-organization');
  if (!script) {
    script = el('script'); script.type = 'application/ld+json'; script.id = 'kw-organization';
    document.head.append(script);
  }
  script.textContent = JSON.stringify(data);
  return channels;
}
