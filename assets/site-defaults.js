// Расширенное содержимое сайта (схема 2): тексты главной страницы, дополнительные контакты,
// вопросы и ответы, списки комплектации и фотографии карточек.
// Модуль общий для витрины, панели мастерской и сервера, поэтому не обращается к DOM.

export const SCHEMA = 2;

export const BADGES = Object.freeze({ stock: 'В наличии', new: 'Новинка', hit: 'Часто заказывают' });

export const LIMITS = Object.freeze({
  brandRu: 60, contactName: 60, max: 200, vk: 200, whatsapp: 16, mapUrl: 500,
  notice: 160, about: 1200, seoTitle: 120, seoDescription: 300,
  facts: 4, factTitle: 60, factText: 180,
  steps: 5, stepTitle: 60, stepText: 240,
  faq: 12, question: 160, answer: 800,
  materials: 8, materialTitle: 60, materialText: 240,
  included: 10, includedText: 200, clarify: 400, gallery: 6,
});

export const DEFAULT_EXTRA = Object.freeze({
  brandRu: 'Каркасвуд',
  contactName: 'Дмитрий',
  max: '',
  vk: '',
  whatsapp: '',
  mapUrl: '',
  themeMode: '',
  notice: '',
  about: 'Каркасная мастерская в селе Косулино под Екатеринбургом. Строим бани, бытовки, хозблоки и дома: от компактного хозблока до бани с террасой. В каталоге — постройки, которые мастерская уже изготовила и показала в своём канале.',
  seoTitle: '',
  seoDescription: '',
  facts: Object.freeze([
    Object.freeze({ title: 'Своё производство', text: 'Постройки собирают в цехе в селе Косулино Свердловской области.' }),
    Object.freeze({ title: 'Работа по договору', text: 'Комплектацию и стоимость заказа закрепляют в договоре до начала работ.' }),
    Object.freeze({ title: 'Доставка и монтаж', text: 'Постройку привезут и установят на участке. Отправляют по всей России.' }),
    Object.freeze({ title: 'Под ваши размеры', text: 'Планировку, отделку и комплектацию меняют под задачу и участок.' }),
  ]),
  steps: Object.freeze([
    Object.freeze({ title: 'Расскажите о задаче', text: 'Напишите или позвоните: какой участок, какие нужны размеры и что должно быть внутри.' }),
    Object.freeze({ title: 'Получите расчёт', text: 'Мастерская посчитает стоимость под вашу комплектацию и отдельно назовёт цену доставки и монтажа.' }),
    Object.freeze({ title: 'Заключите договор', text: 'В договоре закрепляют комплектацию, цену и порядок оплаты. Оплатить можно наличными, переводом или по счёту.' }),
    Object.freeze({ title: 'Примите постройку', text: 'Готовую постройку привезут и установят на участке. Можно забрать её самовывозом из Косулина.' }),
  ]),
  materials: Object.freeze([
    Object.freeze({ title: 'Каркас', text: 'Доска 100 × 40 или 100 × 50 мм. По запросу — камерной сушки с огнебиозащитой.' }),
    Object.freeze({ title: 'Утепление', text: 'Минеральная вата 100 мм в полу, стенах и потолке утеплённых построек.' }),
    Object.freeze({ title: 'Фасад', text: 'Имитация бруса и профлист. Цвет и сочетание материалов выбирают под участок.' }),
    Object.freeze({ title: 'Кровля', text: 'Профлист. Мягкая черепица — как дополнительная работа.' }),
    Object.freeze({ title: 'Внутри', text: 'ОСБ или вагонка, в парных — липа. Пол из доски, шпунта или лиственницы.' }),
    Object.freeze({ title: 'Электрика', text: 'Свет, розетки и фасадные светильники — по комплектации проекта.' }),
  ]),
  faq: Object.freeze([
    Object.freeze({ q: 'Сколько стоят доставка и монтаж?', a: 'Цены в каталоге указаны без доставки и монтажа. Их рассчитывают отдельно: сумма зависит от адреса и размеров постройки. Напишите, куда нужно привезти, и мастерская назовёт стоимость до заключения договора.' }),
    Object.freeze({ q: 'Куда вы доставляете?', a: 'Производство находится в селе Косулино Свердловской области. Постройки отправляют по Екатеринбургу, области и в другие регионы России. Готовую постройку можно забрать самовывозом.' }),
    Object.freeze({ q: 'Нужен ли фундамент?', a: 'Основание подбирают под участок и размер постройки. По договорённости мастерская установит винтовые сваи. Это отдельная работа, в цену постройки она не входит.' }),
    Object.freeze({ q: 'Можно ли изменить размеры, планировку или отделку?', a: 'Да. Проекты в каталоге — уже построенные работы. Под ваш участок меняют размеры, расположение окон и дверей, отделку и комплектацию. Стоимость пересчитают под новый состав.' }),
    Object.freeze({ q: 'Почему рядом с ценой стоит дата?', a: 'Это цена конкретной постройки на день публикации в канале мастерской. Стоимость материалов меняется, поэтому актуальную цену уточняйте перед заказом. Окончательная сумма закрепляется в договоре.' }),
    Object.freeze({ q: 'Как оформить заказ и оплатить?', a: 'Мастерская работает по договору. Оплатить можно наличными, переводом на карту или безналичным платежом на расчётный счёт. Порядок оплаты согласуют до начала работ.' }),
    Object.freeze({ q: 'Можно ли посмотреть постройки вживую?', a: 'Да. По договорённости можно приехать в цех в Косулине и посмотреть работы. Заранее уточните, какие постройки сейчас на площадке.' }),
    Object.freeze({ q: 'Какие сроки изготовления и гарантия?', a: 'Срок зависит от размера постройки, комплектации и загрузки цеха. Точные сроки и гарантийные условия уточните при расчёте и проверьте в договоре перед подписанием.' }),
  ]),
});

const controls = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max) => typeof value === 'string' && value.length <= max && !controls.test(value);

function httpsLink(value, hosts) {
  if (!text(value, 500) || !/^https:\/\//i.test(value) || /[\s\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    if (!url.hostname || url.username || url.password) return false;
    return !hosts || hosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host));
  } catch { return false; }
}

function pairList(value, max, a, aMax, b, bMax) {
  return Array.isArray(value) && value.length <= max && value.every(entry =>
    isRecord(entry) && Object.keys(entry).every(key => key === a || key === b)
    && text(entry[a], aMax) && entry[a].trim() && text(entry[b], bMax));
}

// Возвращает текст ошибки или пустую строку. Сервер и панель проверяют одинаково.
export function extraValidationError(extra) {
  if (extra === undefined) return '';
  if (!isRecord(extra)) return 'Проверьте структуру раздела с текстами сайта.';
  for (const key of Object.keys(extra)) {
    if (!Object.hasOwn(DEFAULT_EXTRA, key)) return 'В текстах сайта есть неизвестное поле.';
  }
  for (const key of ['brandRu', 'contactName', 'notice', 'about', 'seoTitle', 'seoDescription']) {
    if (extra[key] !== undefined && !text(extra[key], LIMITS[key])) {
      return 'Один из текстов сайта длиннее допустимого (' + LIMITS[key] + ' символов).';
    }
  }
  if (extra.max !== undefined && extra.max !== '' && !httpsLink(extra.max, ['max.ru'])) {
    return 'Ссылка на MAX должна начинаться с https://max.ru/';
  }
  if (extra.vk !== undefined && extra.vk !== '' && !httpsLink(extra.vk, ['vk.com', 'vk.ru'])) {
    return 'Ссылка на ВКонтакте должна начинаться с https://vk.com/ или https://vk.ru/';
  }
  if (extra.whatsapp !== undefined && extra.whatsapp !== '' && !/^\+[1-9]\d{6,14}$/.test(extra.whatsapp)) {
    return 'Номер WhatsApp укажите в формате +79990001122.';
  }
  if (extra.mapUrl !== undefined && extra.mapUrl !== '' && !httpsLink(extra.mapUrl)) {
    return 'Ссылка на карту должна начинаться с https://';
  }
  if (extra.themeMode !== undefined && extra.themeMode !== '' && extra.themeMode !== 'auto') {
    return 'Выберите режим оформления из списка.';
  }
  if (extra.facts !== undefined && !pairList(extra.facts, LIMITS.facts, 'title', LIMITS.factTitle, 'text', LIMITS.factText)) {
    return 'Проверьте блок преимуществ: до 4 пунктов с заголовком.';
  }
  if (extra.steps !== undefined && !pairList(extra.steps, LIMITS.steps, 'title', LIMITS.stepTitle, 'text', LIMITS.stepText)) {
    return 'Проверьте шаги заказа: до 5 шагов с заголовком.';
  }
  if (extra.materials !== undefined && !pairList(extra.materials, LIMITS.materials, 'title', LIMITS.materialTitle, 'text', LIMITS.materialText)) {
    return 'Проверьте блок «Из чего строят»: до 8 строк с названием.';
  }
  if (extra.faq !== undefined && !pairList(extra.faq, LIMITS.faq, 'q', LIMITS.question, 'a', LIMITS.answer)) {
    return 'Проверьте вопросы и ответы: до 12 вопросов, у каждого должен быть текст вопроса.';
  }
  return '';
}

// Дополнительные поля карточки. Фотографии галереи сервер проверяет отдельно.
export function itemExtraValidationError(item) {
  if (item.included !== undefined && !(Array.isArray(item.included) && item.included.length <= LIMITS.included
    && item.included.every(line => text(line, LIMITS.includedText) && line.trim()))) {
    return 'Комплектация карточки: до 10 строк, каждая до 200 символов.';
  }
  if (item.clarify !== undefined && !text(item.clarify, LIMITS.clarify)) {
    return 'Поле «Уточнить при заказе» должно быть текстом до 400 символов.';
  }
  if (item.badge !== undefined && item.badge !== '' && !Object.hasOwn(BADGES, item.badge)) {
    return 'Выберите отметку карточки из списка.';
  }
  if (item.gallery !== undefined && !(Array.isArray(item.gallery) && item.gallery.length <= LIMITS.gallery
    && item.gallery.every(photo => typeof photo === 'string' && photo))) {
    return 'В карточке может быть до 6 дополнительных фотографий.';
  }
  return '';
}

export const ITEM_EXTRA_KEYS = Object.freeze(['included', 'clarify', 'badge', 'gallery']);

function cleanExtra(extra) {
  const source = isRecord(extra) ? extra : {};
  const result = {};
  for (const [key, fallback] of Object.entries(DEFAULT_EXTRA)) {
    const value = source[key];
    if (Array.isArray(fallback)) {
      result[key] = (Array.isArray(value) ? value : fallback).filter(isRecord).map(entry => ({ ...entry }));
    } else result[key] = typeof value === 'string' ? value : fallback;
  }
  return result;
}

// Дополняет каталог значениями по умолчанию. Старый сервер (схема 1) не хранит расширенные поля,
// поэтому витрина берёт их отсюда, а панель знает, что публиковать их пока нельзя.
export function normalizeSite(site) {
  const settings = { ...site.settings, extra: cleanExtra(site.settings?.extra) };
  return { ...site, settings, items: site.items.map(item => ({ ...item })) };
}

// Убирает всё, чего не знает сервер первой версии.
export function stripExtended(site) {
  const { extra, ...settings } = site.settings;
  const items = site.items.map(item => {
    const copy = { ...item };
    for (const key of ITEM_EXTRA_KEYS) delete copy[key];
    return copy;
  });
  return { ...site, settings, items };
}

// Новогоднее оформление по календарю: с 1 декабря по 14 января включительно.
export function isHolidaySeason(date = new Date()) {
  const month = date.getMonth() + 1;
  return month === 12 || (month === 1 && date.getDate() <= 14);
}

// Какое оформление показывать: ручной выбор владельца или календарь, если включён автоматический режим.
export function resolveTheme(settings, date = new Date()) {
  if (settings?.extra?.themeMode === 'auto') return isHolidaySeason(date) ? 'newyear' : 'classic';
  return settings?.theme === 'newyear' ? 'newyear' : 'classic';
}

export function supportsExtended(site) {
  return Number(site?.schema) >= SCHEMA;
}
