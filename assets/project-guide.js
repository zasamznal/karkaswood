import { getTourId } from './tour-registry.js';
import { getProjectCover } from './project-covers.js';

const uses = [
  {
    category: 'bath', label: 'Париться и отдыхать', preferred: 'bath-terrace',
    criterion: 'Подумайте, сколько человек будет париться вместе и где вы хотите отдыхать после парной.',
    other: 'Смотреть все бани', request: 'Баня по вашим размерам', discuss: 'Обсудить баню',
    prompts: ['Размер площадки', 'Количество гостей', 'Мойка и место для отдыха']
  },
  {
    category: 'cabin', label: 'Обжиться на участке', preferred: 'barn-2-4-5',
    criterion: 'Наметьте места для мебели и проверьте, можно ли свободно пройти от двери к окну.',
    other: 'Смотреть все бытовки', request: 'Бытовка для участка', discuss: 'Обсудить бытовку',
    prompts: ['Место на участке', 'Мебель и вещи', 'Сезон использования']
  },
  {
    category: 'utility', label: 'Хранить инвентарь', preferred: 'loft-woodstore',
    criterion: 'Измерьте самую широкую вещь, которую будете заносить, и прикиньте, сколько места займут стеллажи.',
    other: 'Смотреть все хозблоки', request: 'Хозблок для участка', discuss: 'Обсудить хозблок',
    prompts: ['Габариты техники', 'Ширина входа', 'Полки и отдельные отсеки']
  },
  {
    category: 'house', label: 'Построить дом', preferred: '',
    criterion: 'Сколько человек будет жить в доме? Прикиньте число комнат и выберите место для дома на участке.',
    other: 'Смотреть все дома', request: 'Дом по вашей планировке', discuss: 'Обсудить проект дома',
    prompts: ['Размеры участка', 'Нужные комнаты', 'Пожелания к планировке']
  }
];

const orderSteps = [
  ['Обсудите задачу', 'Расскажите Дмитрию о месте на участке, размерах и нужной комплектации.'],
  ['Запросите расчёт', 'Уточните, что входит в стоимость выбранного варианта и какие работы считают отдельно.'],
  ['Согласуйте просмотр', 'Спросите, какую постройку можно увидеть вживую, где она находится и когда можно приехать.']
];
let serial = 0;

function el(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value) node.textContent = value;
  return node;
}

function photoUrl(value) {
  if (typeof value !== 'string' || !value || /[\x00-\x20\\]/.test(value)) return '';
  if (/^data:image\/(?:png|webp|jpe?g|gif|avif);base64,[a-z\d+/=]+$/i.test(value)) return value;
  try {
    const url = new URL(value, document.baseURI);
    if ((url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === location.origin)) &&
        !url.username && !url.password) return url.href;
    if (location.protocol === 'file:' && url.protocol === 'file:' && !/^(?:[a-z]+:|\/)/i.test(value)) return url.href;
  } catch {}
  return '';
}

function button(label, className, action) {
  const control = el('button', className, label);
  control.type = 'button';
  control.addEventListener('click', () => action(control));
  return control;
}

function link(label, className, href) {
  const anchor = el('a', className, label);
  anchor.href = href;
  return anchor;
}

function orderBlock(id) {
  const section = el('section', 'pg-order');
  const title = el('h3', 'pg-order-title', 'Как заказать');
  const intro = el('div', 'pg-order-intro');
  title.id = id + '-order';
  section.setAttribute('aria-labelledby', title.id);
  const steps = el('ol', 'pg-steps');
  for (const [name, note] of orderSteps) {
    const step = el('li');
    step.append(el('h4', '', name), el('p', '', note));
    steps.append(step);
  }
  intro.append(title);
  section.append(intro, steps);
  return section;
}

export function renderProjectGuide(container, items, {onDetails, onContact, onCategory} = {}) {
  const id = 'pg-guide-' + (++serial);
  const root = el('div', 'pg-guide');
  const wrap = el('div', 'wrap pg-wrap');
  const heading = el('h2', 'pg-heading', 'Для чего нужна постройка?');
  heading.id = id + '-title';
  const layout = el('div', 'pg-layout');
  const tabs = el('div', 'pg-uses');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-labelledby', heading.id);
  const panel = el('div', 'pg-panel');
  const order = orderBlock(id);
  panel.id = id + '-panel';
  panel.setAttribute('role', 'tabpanel');
  const entries = (Array.isArray(items) ? items : []).filter(item =>
    item && item.published !== false && item.visible !== false && typeof item.name === 'string' && item.name.trim()
  ).map(item => ({item, photo: photoUrl(item.photo), cover:getProjectCover(item)}));
  const groups = uses.map(use => entries.filter(entry => entry.item.category === use.category));
  const controls = [];
  let selected = -1;

  function contact(label, item, className = 'pg-primary') {
    if (onContact) return button(label, className, trigger => onContact(item, trigger));
    const anchor = link(label, className, '#visit');
    anchor.dataset.contact = '';
    anchor.dataset.model = item.name;
    anchor.dataset.modelId = item.id || '';
    return anchor;
  }

  function showRequest(use) {
    const brief = el('div', 'pg-brief');
    const copy = el('div', 'pg-brief-copy');
    const request = {category: use.category, id: use.category + '-project', name:
      use.category === 'house' ? 'Индивидуальный проект дома' : use.request};
    copy.append(el('h3', 'pg-project-name', use.request), el('p', 'pg-criterion', use.criterion),
      contact(use.discuss, request));
    const list = el('div', 'pg-brief-notes');
    const prompts = el('ul');
    for (const text of use.prompts) prompts.append(el('li', '', text));
    list.append(el('h4', '', 'Что пригодится для разговора'), prompts);
    brief.append(copy, list);
    panel.replaceChildren(brief);
    return request;
  }

  function showProject(use, entry, count) {
    const {item, photo, cover} = entry;
    const stage = el('article', 'pg-project');
    if (photo) {
      const figure = el('div', 'pg-photo');
      const image = el('img');
      image.alt = cover?.alt || item.name;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => {
        if (cover && image.src === cover.src && cover.src !== photo) {
          image.src = photo;
          image.alt = item.name;
        } else {
          figure.remove();
          stage.classList.add('pg-text-only');
        }
      });
      if (cover) image.style.objectPosition = cover.position;
      image.src = cover?.src || photo;
      figure.append(image);
      stage.append(figure);
    } else stage.classList.add('pg-text-only');
    const text = el('div', 'pg-project-copy');
    const meta = el('div', 'pg-meta');
    meta.append(el('span', '', cover && !cover.isOriginal ? 'Визуализация по фото' : 'Проект мастерской'));
    if (item.dimensions) meta.append(el('span', 'pg-size', item.dimensions));
    const title = el('h3', 'pg-project-name', item.name);
    text.append(meta, title);
    if (item.summary) text.append(el('p', 'pg-summary', item.summary));
    text.append(el('p', 'pg-criterion', use.criterion));
    const actions = el('div', 'pg-actions');
    if (onDetails) {
      actions.append(button('Посмотреть проект', 'pg-primary', trigger => onDetails(item, trigger, 'details')));
      if (getTourId(item)) actions.append(button('Открыть в 3D', 'pg-link', trigger => onDetails(item, trigger, 'tour')));
    } else actions.append(contact(use.discuss, item));
    if (count > 1 && onCategory) actions.append(button(use.other, 'pg-link', trigger => onCategory(use.category, trigger)));
    text.append(actions);
    stage.append(text);
    panel.replaceChildren(stage);
  }

  function select(category) {
    const index = uses.findIndex(use => use.category === category);
    if (index < 0 || index === selected) return;
    selected = index;
    const use = uses[index];
    controls.forEach((control, i) => {
      control.tabIndex = i === index ? 0 : -1;
      control.setAttribute('aria-selected', String(i === index));
    });
    panel.setAttribute('aria-labelledby', controls[index].id);
    const group = groups[index];
    const recommendation = group.find(entry => entry.photo && entry.item.id === use.preferred) ||
      group.find(entry => entry.photo) || group[0];
    let subject;
    if (recommendation) {
      subject = recommendation.item;
      showProject(use, recommendation, group.length);
    } else subject = showRequest(use);
    const orderIntro = order.querySelector('.pg-order-intro');
    orderIntro.querySelector('.pg-link')?.remove();
    orderIntro.append(contact('Обсудить с Дмитрием', subject, 'pg-link'));
  }

  for (const [index, use] of uses.entries()) {
    const tab = button(use.label, 'pg-tab', () => select(use.category));
    tab.id = id + '-' + use.category;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    tab.addEventListener('keydown', event => {
      const targets = {ArrowLeft: index-1, ArrowUp: index-1, ArrowRight: index+1, ArrowDown: index+1, Home: 0, End: uses.length-1};
      if (!Object.hasOwn(targets, event.key)) return;
      event.preventDefault();
      const next = (targets[event.key] + uses.length) % uses.length;
      select(uses[next].category);
      controls[next].focus();
    });
    tabs.append(tab);
    controls.push(tab);
  }
  layout.append(tabs, panel);
  wrap.append(heading, layout, order);
  root.append(wrap);
  container.replaceChildren(root);
  const first = groups.findIndex(group => group.length > 0);
  select(first >= 0 ? uses[first].category : 'house');
  return {select, destroy() { root.remove(); }};
}
