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

export function mountCatalog(container, items, {onContact} = {}) {
  const key = 'kc-'+(++instance);
  const entries = (Array.isArray(items) ? items : []).filter(item =>
    item && item.published !== false && item.visible !== false && typeof item.name === 'string' && item.name.trim() && categoryNames.has(item.category)
  ).map(item => ({item, photo:photoURL(item.photo)})).filter(({item,photo}) => item.category !== 'house' || photo);
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

  function contactButton(item, label, origin) {
    const button = element('button','kc-contact',label);
    button.type = 'button';
    button.append(icon('next'));
    if (typeof onContact !== 'function') {
      button.dataset.contact = '';
      button.dataset.model = item.name;
      button.dataset.modelId = item.id || '';
    }
    button.addEventListener('click',() => {
      if (dialog.open) dialog.close();
      if (typeof onContact === 'function') onContact(item,origin || button);
    });
    return button;
  }

  function details(entry, origin) {
    const {item,photo} = entry;
    const content = element('div','kc-detail');
    if (photo) content.append(image(photo,item.name));
    const description = element('div','kc-description');
    const heading = element('h3','kc-detail-title',item.name);
    heading.id = key+'-title';
    description.append(element('p','kc-kind',categoryNames.get(item.category)),heading);
    if (item.summary) description.append(element('p','kc-summary',item.summary));
    const facts = element('dl','kc-facts');
    for (const [label,value] of [['Габариты',item.dimensions],['Цена',priceLabel(item.price)],['Дата публикации',dateLabel(item.published)]]) {
      if (value) facts.append(element('dt','',label),element('dd','',value));
    }
    if (facts.childElementCount) description.append(facts);
    const source = sourceURL(item.source);
    if (source) {
      const link = element('a','kc-source','Публикация мастерской');
      link.href = source;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.append(icon('out'));
      description.append(link);
    }
    const actions = element('div','kc-actions');
    actions.append(contactButton(item,'Обсудить модель',origin));
    if (item.id === 'barn-2-4-5') actions.append(tourLink());
    description.append(actions);
    const close = element('button','kc-close');
    close.type = 'button';
    close.setAttribute('aria-label','Закрыть карточку');
    close.autofocus = true;
    close.append(icon('close'));
    close.addEventListener('click',()=>dialog.close());
    content.append(description,close);
    dialog.replaceChildren(content);
    dialog.showModal();
  }

  function tourLink() {
    const link = element('a','kc-tour','Открыть 3D');
    link.href = '#viewer';
    link.prepend(icon('cube'));
    link.addEventListener('click',()=>{ if (dialog.open) dialog.close(); });
    return link;
  }

  function card(entry) {
    const {item,photo} = entry;
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
    const price = priceLabel(item.price);
    if (price) info.append(element('span','kc-price',price));
    const arrow = element('span','kc-open-arrow');
    arrow.append(icon('next'));
    info.append(arrow);
    opener.append(visual,info);
    article.append(opener);
    if (item.id === 'barn-2-4-5') article.append(tourLink());
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
    selected = category;
    expanded = false;
    categories.forEach(([id],i) => {
      const active = id === category;
      tabs[i].tabIndex = active ? 0 : -1;
      tabs[i].setAttribute('aria-selected',String(active));
      if (active) panel.setAttribute('aria-labelledby',tabs[i].id);
    });
    renderCards();
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
  return {setFilter:select, destroy() { if (dialog.open) dialog.close(); root.remove(); }};
}
