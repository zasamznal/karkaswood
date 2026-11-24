import { getTourId } from './tour-registry.js';
import { getOffer } from './project-offers.js';
import { getProjectPhotos } from './workshop-photos.js';

const categories = [
  ['all', 'Все'],
  ['utility', 'Хозблоки', 'Хозблок'],
  ['bath', 'Бани', 'Баня'],
  ['cabin', 'Бытовки', 'Бытовка'],
  ['house', 'Дома', 'Дом'],
];
const categoryNames = new Map(categories.slice(1).map(([key, , name]) => [key, name]));
const rubles = new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',minimumFractionDigits:0,maximumFractionDigits:2});
const previewSize = 3;
const projectEndings = {one:'проект',few:'проекта',many:'проектов',other:'проекта'};
const russianPlural = new Intl.PluralRules('ru');
const houseRequest = Object.freeze({id:'house-project', category:'house', name:'Индивидуальный проект дома'});
let instance = 0;

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value != null) node.textContent = value;
  return node;
}

function icon(name) {
  const paths = {
    next:'M4 10h12m-5-5 5 5-5 5',
    close:'m5 5 10 10M15 5 5 15',
    cube:'m10 2 7 4v8l-7 4-7-4V6l7-4Zm-7 4 7 4 7-4m-7 4v8',
    out:'M5 15 15 5M6 5h9v9',
    compare:'M3 16V9h3v7H3Zm6 0V4h3v12H9Zm6 0V7h3v9h-3Z',
    link:'m7 13 6-6M8 6l2-2a4 4 0 0 1 6 6l-2 2m-2 2-2 2a4 4 0 0 1-6-6l2-2',
    house:'M2 9 10 3l8 6m-2-1v9H4V8m4 9v-6h4v6',
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','kc-icon');
  svg.setAttribute('viewBox','0 0 20 20');
  svg.setAttribute('aria-hidden','true');
  const path = document.createElementNS(svg.namespaceURI,'path');
  path.setAttribute('d',paths[name]);
  svg.append(path);
  return svg;
}

function photoURL(value) {
  if (typeof value !== 'string' || !value || /[\x00-\x20\\]/.test(value)) return '';
  if (/^data:image\/(?:webp|png|jpe?g|avif|gif);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  try {
    const url = new URL(value, document.baseURI);
    if (url.protocol === 'https:') return url.href;
    if (url.origin === location.origin && url.protocol === 'http:') return url.href;
    if (location.protocol === 'file:' && url.protocol === 'file:' && !/^(?:[a-z]+:|\/)/i.test(value)) return url.href;
  } catch {}
  return '';
}

function sourceURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

function dateLabel(value) {
  if (typeof value !== 'string') return '';
  const date = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
  if (!date) return value;
  const timestamp = new Date(date[0].slice(0,10)+'T00:00:00Z');
  if (Number.isNaN(timestamp.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(timestamp);
}

function priceLabel(price) {
  return Number.isFinite(price) && price > 0 ? rubles.format(price) : '';
}

function image(src,name) {
  const img = element('img');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = name;
  img.src = src;
  return img;
}

function projectGallery(item, cover) {
  const photos = [];
  if (cover) photos.push({src:cover, alt:item.photoAlt || [item.name,item.dimensions].filter(Boolean).join(', ')});
  for (const candidate of getProjectPhotos(item)) {
    const src = photoURL(candidate.src);
    if (src && candidate.alt && !photos.some(photo => photo.src === src)) photos.push({src,alt:candidate.alt});
  }
  if (!photos.length) return null;
  const gallery = element('div','kc-gallery');
  const img = image(photos[0].src,photos[0].alt);
  img.loading = 'eager';
  gallery.append(img);
  if (photos.length === 1) return gallery;

  gallery.tabIndex = 0;
  gallery.setAttribute('role','group');
  gallery.setAttribute('aria-label','Фотографии проекта «'+item.name+'»');
  const bar = element('div','kc-gallery-bar');
  const caption = element('span','kc-gallery-caption');
  caption.setAttribute('aria-hidden','true');
  const count = element('span','kc-gallery-count');
  count.setAttribute('role','status');
  count.setAttribute('aria-atomic','true');
  let index = 0;
  function show(step) {
    index = (index+step+photos.length)%photos.length;
    const photo = photos[index];
    img.alt = photo.alt;
    if (img.src !== photo.src) img.src = photo.src;
    caption.textContent = index === 0 && cover && !item.photoAlt ? '' : photo.alt;
    count.textContent = (index+1)+' из '+photos.length;
  }
  function arrow(label, step) {
    const button = element('button','kc-gallery-arrow');
    button.type = 'button';
    button.setAttribute('aria-label',label);
    button.append(icon('next'));
    if (step < 0) button.classList.add('kc-gallery-prev');
    button.addEventListener('click',()=>show(step));
    return button;
  }
  bar.append(caption,arrow('Предыдущее фото',-1),count,arrow('Следующее фото',1));
  gallery.append(bar);
  gallery.addEventListener('keydown',event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(event.key === 'ArrowLeft' ? -1 : 1);
  });
  show(0);
  return gallery;
}

export function mountCatalog(container, items, {onContact, onTour, onCompare, onCategoryChange} = {}) {
  let compared = new Set();
  const key = 'kc-'+(++instance);
  const entries = (Array.isArray(items) ? items : []).filter(item =>
    item && item.published !== false && item.visible !== false && typeof item.name === 'string' && item.name.trim() && categoryNames.has(item.category)
  ).map(item => ({item, photo:photoURL(item.photo), offer:getOffer(item)}));
  const root = element('div','kc-root');
  const filters = element('div','kc-filters');
  filters.setAttribute('role','tablist');
  filters.setAttribute('aria-label','Категории построек');
  const panel = element('div','kc-panel');
  panel.id = key+'-panel';
  panel.setAttribute('role','tabpanel');
  const grid = element('div','kc-grid');
  grid.id = key+'-grid';
  const more = element('button','kc-more');
  more.type = 'button';
  more.setAttribute('aria-controls',grid.id);
  const status = element('div','kc-status');
  status.setAttribute('role','status');
  panel.append(grid,more);
  root.append(filters,panel,status);
  const dialog = element('dialog','kc-dialog');
  dialog.setAttribute('aria-labelledby',key+'-title');
  root.append(dialog);
  container.replaceChildren(root);

  function contactButton(item, label, origin, intent = 'project') {
    const button = element('button','kc-contact',label);
    button.type = 'button';
    button.dataset.inquiry = intent;
    if (typeof onContact !== 'function') {
      button.dataset.contact = '';
      button.dataset.model = item.name;
      button.dataset.modelId = item.id || '';
    }
    button.addEventListener('click',() => {
      if (dialog.open) dialog.close();
      if (typeof onContact === 'function') onContact(item,origin || button,intent);
    });
    return button;
  }

  function sourceLink(label, href) {
    const url = sourceURL(href);
    if (!url) return null;
    const link = element('a','kc-source',label);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.append(icon('out'));
    return link;
  }

  function projectLinks(item) {
    const links = element('div','kc-detail-links');
    const source = sourceLink('Публикация мастерской',item.source);
    if (source) links.append(source);
    const url = new URL(location.href);
    if (!item.id || !['http:','https:'].includes(url.protocol) || url.searchParams.get('preview') === 'draft') return links;
    const season = url.searchParams.get('season');
    url.hash = '';
    url.search = '';
    url.searchParams.set('item',item.id);
    if (season === 'classic' || season === 'newyear') url.searchParams.set('season',season);
    const copy = element('button','kc-share','Скопировать ссылку на проект');
    copy.type = 'button';
    copy.prepend(icon('link'));
    const status = element('span','kc-share-status');
    status.setAttribute('role','status');
    const field = element('input','kc-share-field');
    field.type = 'url';
    field.readOnly = true;
    field.hidden = true;
    field.setAttribute('aria-label','Ссылка на проект');
    field.value = url.href;
    copy.addEventListener('click',async()=>{
      try {
        await navigator.clipboard.writeText(url.href);
        field.hidden = true;
        status.textContent = 'Ссылка скопирована';
      } catch {
        if (!copy.isConnected || !dialog.open) return;
        field.hidden = false;
        field.focus();
        field.select();
        status.textContent = 'Скопируйте выделенную ссылку';
      }
    });
    links.append(copy,field,status);
    return links;
  }

  function compareButton(item) {
    const button = element('button','kc-compare');
    button.type = 'button';
    button.dataset.compareId = item.id;
    button.append(icon('compare'),element('span'));
    button.addEventListener('click',()=>onCompare(item,button));
    showCompared(button);
    return button;
  }

  function showCompared(button) {
    const active = compared.has(button.dataset.compareId);
    button.setAttribute('aria-pressed',String(active));
    button.querySelector('span').textContent = active ? 'В сравнении' : 'Сравнить';
  }

  function prices(offer, detailed = false, projectSource) {
    const price = priceLabel(offer.currentPrice);
    const historical = offer.reference;
    const oldPrice = priceLabel(historical?.price);
    const date = dateLabel(historical?.date);
    const node = element('div','kc-offer-price');
    if (price) {
      node.append(element('span','kc-price-type','Цена мастерской'),element('strong','kc-price',price));
    } else if (!oldPrice || !date) {
      node.append(element('span','kc-price-request','Цена по запросу'));
    }
    if (offer.currentNote) {
      const note = element('p','kc-owner-note');
      if (!price) note.append(element('span','','Условия мастерской'));
      note.append(document.createTextNode(offer.currentNote));
      node.append(note);
    }
    if (oldPrice && date && (detailed || !price)) {
      const archive = element('div','kc-reference');
      archive.append(element('span','kc-reference-label','Цена в публикации от '+date),element('span','kc-reference-amount',oldPrice));
      if (detailed && historical.description) archive.append(element('p','kc-reference-note',historical.description));
      if (detailed && historical.source !== projectSource) {
        const link = sourceLink('Источник цены',historical.source);
        if (link) archive.append(link);
      }
      node.append(archive);
    }
    return node;
  }

  function featureList(title, values) {
    if (!Array.isArray(values) || !values.length) return null;
    const group = element('section','kc-feature-group');
    const list = element('ul');
    values.forEach(value=>list.append(element('li','',value)));
    group.append(element('h4','',title),list);
    return group;
  }

  function details(entry, origin) {
    const {item,photo,offer} = entry;
    const content = element('div','kc-detail');
    const gallery = projectGallery(item,photo);
    if (gallery) content.append(gallery);
    const description = element('div','kc-description');
    const heading = element('h3','kc-detail-title',item.name);
    heading.id = key+'-title';
    description.append(element('p','kc-kind',categoryNames.get(item.category)),heading);
    if (item.summary) description.append(element('p','kc-summary',item.summary));
    const facts = element('dl','kc-facts');
    if (item.dimensions) facts.append(element('dt','','Габариты'),element('dd','',item.dimensions));
    if (facts.childElementCount) description.append(facts);
    description.append(prices(offer,true,item.source));
    const specs = element('div','kc-detail-lists');
    const included = featureList('В показанном проекте',offer.included);
    const clarify = featureList('Уточнить при заказе',offer.clarify);
    if (included) specs.append(included);
    if (clarify) specs.append(clarify);
    if (specs.childElementCount) description.append(specs);
    const links = projectLinks(item);
    if (links.childElementCount) description.append(links);
    const actions = element('div','kc-actions');
    const askPrice = !priceLabel(offer.currentPrice);
    actions.append(contactButton(item,askPrice?'Запросить цену':'Обсудить модель',origin,askPrice?'price':'project'));
    if (getTourId(item)) actions.append(tourLink(item, origin));
    if (typeof onCompare === 'function') actions.append(compareButton(item));
    description.append(actions);
    const close = element('button','kc-close');
    close.type = 'button';
    close.setAttribute('aria-label','Закрыть карточку');
    close.autofocus = true;
    close.append(icon('close'));
    close.addEventListener('click',()=>dialog.close());
    content.append(description,close);
    dialog.replaceChildren(content);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    return true;
  }

  function tourLink(item, opener) {
    const embedded = getTourId(item) === 'barn-2-4-5';
    const link = element(embedded ? 'a' : 'button','kc-tour','Смотреть в 3D');
    link.setAttribute('aria-label','Смотреть в 3D: '+item.name);
    if (embedded) link.href = '#viewer';
    else {
      link.type = 'button';
      link.setAttribute('aria-haspopup','dialog');
    }
    link.prepend(icon('cube'));
    link.addEventListener('click', () => {
      if (dialog.open) dialog.close();
      onTour?.(item, opener || link, onContact);
    });
    return link;
  }

  function card(entry) {
    const {item,photo,offer} = entry;
    const article = element('article','kc-card');
    const opener = element('button','kc-card-open');
    opener.type = 'button';
    opener.setAttribute('aria-label','Подробнее о модели «'+item.name+'»');
    opener.setAttribute('aria-haspopup','dialog');
    opener.addEventListener('click',()=>details(entry,opener));
    const visual = element('span','kc-visual');
    if (photo) {
      const img = image(photo,'');
      visual.append(img);
      img.addEventListener('error',()=>{ visual.replaceChildren(icon('house')); },{once:true});
    } else visual.append(icon('house'));
    const notes = element('span','kc-meta');
    notes.append(element('span','kc-kind',categoryNames.get(item.category)));
    if (item.dimensions) notes.append(element('span','kc-size',item.dimensions));
    const name = element('span','kc-name',item.name);
    const info = element('span','kc-card-info');
    info.append(notes,name);
    const arrow = element('span','kc-open-arrow');
    arrow.append(icon('next'));
    info.append(arrow);
    opener.append(visual,info);
    article.append(opener);
    if (getTourId(item)) article.append(tourLink(item));
    const terms = element('div','kc-card-terms');
    terms.append(prices(offer));
    const known = offer.included?.[0];
    if (known) terms.append(element('p','kc-card-feature',known));
    const condition = offer.clarify?.[0];
    if (condition) {
      const line = element('p','kc-card-condition');
      line.append(element('span','','Уточнить при заказе'),document.createTextNode(condition));
      terms.append(line);
    }
    const actionRow = element('div','kc-card-actions');
    const askPrice = !priceLabel(offer.currentPrice);
    actionRow.append(contactButton(item,askPrice?'Запросить цену':'Обсудить модель',null,askPrice?'price':'project'));
    if (typeof onCompare === 'function') actionRow.append(compareButton(item));
    article.append(terms,actionRow);
    return article;
  }

  function empty(category) {
    const box = element('div','kc-empty');
    const text = element('div');
    if (category === 'house') {
      text.append(element('h3','','Какой дом вы хотите построить?'),
        element('p','','Расскажите Дмитрию о желаемых размерах и планировке дома.'));
      box.append(text,contactButton(houseRequest,'Обсудить проект дома'));
    } else {
      text.append(element('h3','','Пока нет опубликованных моделей'));
      box.append(text);
    }
    return box;
  }

  const tabs = categories.map(([id,label]) => {
    const tab = element('button','kc-tab',label);
    tab.type = 'button';
    tab.id = key+'-tab-'+id;
    tab.setAttribute('role','tab');
    tab.setAttribute('aria-controls',panel.id);
    tab.addEventListener('click',()=>select(id));
    filters.append(tab);
    return tab;
  });

  let selected;
  let expanded = false;
  function renderCards() {
    const all = selected === 'all';
    const matching = all ? entries : entries.filter(({item}) => selected === item.category);
    const showToggle = all && matching.length > previewSize;
    const shown = showToggle && !expanded ? matching.slice(0,previewSize) : matching;
    grid.replaceChildren(...(shown.length ? shown.map(card) : [empty(selected)]));
    more.hidden = !showToggle;
    more.setAttribute('aria-expanded', String(expanded && showToggle));
    if (showToggle) {
      const count = matching.length - previewSize;
      more.textContent = expanded ? 'Свернуть список' : 'Показать ещё '+count+' '+projectEndings[russianPlural.select(count)];
    }
    status.textContent = shown.length ? 'Показано моделей: '+shown.length+' из '+matching.length : 'В этой категории пока нет опубликованных моделей';
  }
  more.addEventListener('click',event => {
    expanded = !expanded;
    renderCards();
    if (expanded && event.detail === 0) grid.children[previewSize]?.querySelector('button')?.focus();
  });
  function select(category) {
    if (category !== 'all' && !categoryNames.has(category)) return false;
    if (selected === category) return true;
    const notify = selected !== undefined;
    selected = category;
    expanded = false;
    categories.forEach(([id],i) => {
      const active = id === category;
      tabs[i].tabIndex = active ? 0 : -1;
      tabs[i].setAttribute('aria-selected',String(active));
      if (active) panel.setAttribute('aria-labelledby',tabs[i].id);
    });
    renderCards();
    if (notify) onCategoryChange?.(category);
    return true;
  }
  filters.addEventListener('keydown',event => {
    const i = tabs.indexOf(event.target);
    const next = {ArrowLeft:(i-1+tabs.length)%tabs.length,ArrowRight:(i+1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
    if (i === -1 || next === undefined) return;
    event.preventDefault();
    tabs[next].focus();
    select(categories[next][0]);
  });
  dialog.addEventListener('click',event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientY < r.top || event.clientX > r.right || event.clientY > r.bottom) dialog.close();
  });
  select('all');
  return {
    setFilter:select,
    setCompared(ids) {
      compared = new Set(ids);
      root.querySelectorAll('[data-compare-id]').forEach(showCompared);
    },
    openItem(itemOrId,trigger) {
      const id = typeof itemOrId === 'string' ? itemOrId : itemOrId?.id;
      const entry = entries.find(record => record.item.id === id);
      return entry ? details(entry,trigger) : false;
    },
    destroy() { if (dialog.open) dialog.close(); root.remove(); }
  };
}
