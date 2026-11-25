import { LIMITS, isHolidaySeason } from '../assets/site-defaults.js';

// Каждая страница настроек собирается из групп. scope: '' — основные поля, 'legal' — реквизиты,
// 'extra' — расширенные поля (их хранит только сервер второй версии).
const groups = [
  {
    section: 'main', title: 'Название и первый экран',
    fields: [
      { key: 'brand', label: 'Название латиницей', placeholder: 'Karkaswood', required: true,
        hint: 'Показывается мелкой строкой под русским названием.' },
      { key: 'brandRu', scope: 'extra', label: 'Название по-русски', placeholder: 'Каркасвуд', limit: LIMITS.brandRu,
        hint: 'Стоит первым и крупнее: так требует закон о защите прав потребителей (статья 10.1). Оставьте пустым, только если название зарегистрировано как товарный знак.' },
      { key: 'location', label: 'Где находится мастерская', placeholder: 'Косулино, Свердловская область', required: true, wide: true },
      { key: 'heading', label: 'Заголовок на первом экране', placeholder: 'Бани, бытовки и хозблоки', wide: true, required: true },
      { key: 'intro', label: 'Текст под заголовком', multiline: true, wide: true,
        hint: 'Одно-два предложения о том, что можно посмотреть на сайте.' },
    ],
  },
  {
    section: 'main', title: 'Объявление над шапкой',
    fields: [
      { key: 'notice', scope: 'extra', label: 'Текст объявления', limit: LIMITS.notice, wide: true, counter: true,
        placeholder: 'Например: принимаем заказы на весну',
        hint: 'Короткая строка в самом верху сайта. Оставьте поле пустым, чтобы скрыть объявление.' },
    ],
  },
  {
    section: 'main', title: 'Для поисковых систем',
    note: 'Необязательно. Если оставить пустым, заголовок и описание соберутся из названия и первого экрана.',
    fields: [
      { key: 'seoTitle', scope: 'extra', label: 'Заголовок вкладки', limit: LIMITS.seoTitle, wide: true, counter: true },
      { key: 'seoDescription', scope: 'extra', label: 'Описание для поиска', limit: LIMITS.seoDescription, multiline: true, wide: true, counter: true },
    ],
  },
  {
    section: 'main', title: 'Планировка барн-модуля',
    fields: [
      { key: 'insideWidth', label: 'Внутренняя ширина', type: 'number', min: 185, max: 240,
        unit: 'см', required: true, wide: true,
        hint: 'От 185 до 240 см между внутренними стенами. По этому значению считается проход рядом с кроватью.' },
    ],
  },
  {
    section: 'contacts', title: 'Телефон и мессенджеры',
    note: 'Telegram в России работает с перебоями, поэтому на сайте рядом всегда есть звонок и СМС. Добавьте запасной мессенджер, если пользуетесь им.',
    fields: [
      { key: 'phone', label: 'Телефон для звонков', type: 'tel', placeholder: '+7 (993) 503-19-90',
        hint: 'На этот же номер уходят СМС с телефонов.' },
      { key: 'contactName', scope: 'extra', label: 'Кто отвечает покупателям', placeholder: 'Дмитрий', limit: LIMITS.contactName,
        hint: 'Имя в именительном падеже. С него начинается сообщение покупателя.' },
      { key: 'telegram', label: 'Telegram для заявок', placeholder: '@Karkaswood_ekb',
        hint: 'Имя пользователя или ссылка на личный чат.' },
      { key: 'channel', label: 'Telegram-канал', placeholder: 'https://t.me/karkaswoodstroy',
        hint: 'Имя или публичная ссылка на канал.' },
      { key: 'max', scope: 'extra', label: 'MAX', placeholder: 'https://max.ru/…', limit: LIMITS.max,
        hint: 'Ссылка на ваш профиль или чат в MAX.' },
      { key: 'whatsapp', scope: 'extra', label: 'WhatsApp', type: 'tel', placeholder: '+7 993 503-19-90',
        hint: 'Номер, к которому привязан WhatsApp.' },
      { key: 'vk', scope: 'extra', label: 'ВКонтакте', placeholder: 'https://vk.com/…', limit: LIMITS.vk, wide: true,
        hint: 'Ссылка на страницу или сообщество мастерской.' },
    ],
  },
  {
    section: 'contacts', title: 'Адрес и время работы',
    fields: [
      { key: 'hours', scope: 'legal', label: 'Режим работы', limit: 160, wide: true, placeholder: 'Ежедневно с 9:00 до 20:00' },
      { key: 'mapUrl', scope: 'extra', label: 'Ссылка на карту', placeholder: 'https://yandex.ru/maps/…', limit: LIMITS.mapUrl, wide: true,
        hint: 'Откройте цех на Яндекс Картах или в 2ГИС, нажмите «Поделиться» и вставьте ссылку сюда.' },
    ],
  },
  {
    section: 'texts', title: 'О мастерской',
    fields: [
      { key: 'about', scope: 'extra', label: 'Короткий рассказ', multiline: true, rows: 4, limit: LIMITS.about, wide: true, counter: true,
        hint: 'Два-три предложения под заголовком «Строим в цехе, привозим на участок».' },
    ],
    lists: [
      { key: 'facts', title: 'Преимущества', max: LIMITS.facts, addLabel: 'Добавить преимущество',
        note: 'До четырёх коротких пунктов рядом с рассказом о мастерской.',
        fields: [{ key: 'title', label: 'Заголовок', limit: LIMITS.factTitle, required: true }, { key: 'text', label: 'Пояснение', limit: LIMITS.factText, multiline: true }] },
    ],
  },
  {
    section: 'texts', title: 'Как заказать',
    lists: [
      { key: 'steps', title: 'Шаги заказа', max: LIMITS.steps, addLabel: 'Добавить шаг',
        note: 'Шаги показываются по порядку в блоке «Как заказать».',
        fields: [{ key: 'title', label: 'Название шага', limit: LIMITS.stepTitle, required: true }, { key: 'text', label: 'Что происходит', limit: LIMITS.stepText, multiline: true }] },
    ],
  },
  {
    section: 'texts', title: 'Из чего строят',
    lists: [
      { key: 'materials', title: 'Материалы и конструкция', max: LIMITS.materials, addLabel: 'Добавить строку',
        note: 'Таблица рядом со схемой стены. Удалите все строки, чтобы скрыть блок.',
        fields: [{ key: 'title', label: 'Что', limit: LIMITS.materialTitle, required: true }, { key: 'text', label: 'Из чего и как', limit: LIMITS.materialText, multiline: true }] },
    ],
  },
  {
    section: 'texts', title: 'Частые вопросы',
    lists: [
      { key: 'faq', title: 'Вопросы и ответы', max: LIMITS.faq, addLabel: 'Добавить вопрос',
        note: 'Пишите так, как отвечаете покупателям по телефону. Вопрос без ответа на сайте не показывается.',
        fields: [{ key: 'q', label: 'Вопрос', limit: LIMITS.question, required: true }, { key: 'a', label: 'Ответ', limit: LIMITS.answer, multiline: true, rows: 3 }] },
    ],
  },
  {
    section: 'legal', title: 'Реквизиты продавца', id: 'kw-legal',
    note: 'Эти сведения увидят покупатели в подвале сайта и на странице «Информация для покупателей». По ним сверяют договор.',
    fields: [
      { key: 'form', scope: 'legal', label: 'Форма деятельности', wide: true,
        options: [['', 'Не указана'], ['ip', 'Индивидуальный предприниматель'], ['ooo', 'Общество с ограниченной ответственностью'], ['npd', 'Самозанятый (НПД)']] },
      { key: 'name', scope: 'legal', label: 'Наименование или ФИО', limit: 300, wide: true, hint: 'Полное наименование организации или фамилия, имя и отчество.' },
      { key: 'inn', scope: 'legal', label: 'ИНН', numeric: true, hint: '10 цифр у ООО, 12 у ИП и самозанятого. Контрольные цифры проверяются автоматически.' },
      { key: 'ogrn', scope: 'legal', label: 'ОГРН / ОГРНИП', numeric: true, hint: '13 цифр у ООО, 15 у ИП.' },
      { key: 'address', scope: 'legal', label: 'Адрес для обращений', limit: 500, multiline: true, wide: true,
        hint: 'Показывается в контактах и в политике обработки персональных данных.' },
      { key: 'email', scope: 'legal', label: 'Электронная почта для обращений', limit: 254, type: 'email', wide: true },
      { key: 'regAuthority', scope: 'legal', label: 'Орган регистрации ИП', limit: 300, wide: true, disclosure: 'Дополнительные сведения',
        hint: 'Наименование регистрирующего органа из выписки ЕГРИП.' },
      { key: 'ownerName', scope: 'legal', label: 'ФИО или наименование владельца сайта', limit: 300, wide: true, disclosure: 'Если сайтом владеет другой человек',
        hint: 'Заполняйте, только если сайт оформлен не на продавца.' },
      { key: 'ownerAddress', scope: 'legal', label: 'Адрес владельца сайта для обращений', limit: 500, multiline: true, wide: true, disclosure: 'Если сайтом владеет другой человек' },
      { key: 'ownerEmail', scope: 'legal', label: 'Электронная почта владельца сайта', limit: 254, type: 'email', wide: true, disclosure: 'Если сайтом владеет другой человек' },
    ],
  },
];

const telegramRoutes = new Set([
  'addemoji', 'addlist', 'addstickers', 'addtheme', 'bg', 'boost', 'confirmphone', 'contact',
  'folder', 'giftcode', 'invoice', 'joinchat', 'login', 'nft', 'proxy', 'setlanguage',
  'share', 'socks', 'suggestedpost', 'tonsite',
]);

function telegramUrl(value) {
  const username = value.match(/^(?:@?([a-z][a-z\d_]{3,30}[a-z\d])|(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([a-z][a-z\d_]{3,30}[a-z\d])\/?)$/i);
  if (!username) return null;
  const name = username[1] || username[2];
  return telegramRoutes.has(name.toLowerCase()) ? null : `https://t.me/${name}`;
}

function phoneNumber(value) {
  if (!/^\+?(?:\d|\(\d+\))(?:[  .–-]*(?:\d|\(\d+\)))*$/u.test(value)) return null;
  let digits = value.replace(/\D/g, '');
  if (!value.startsWith('+')) {
    if (digits.length === 10) digits = '7' + digits;
    else if (digits.length === 11 && /^[78]/.test(digits)) digits = '7' + digits.slice(1);
    else return null;
  }
  if (!/^[1-9]\d{6,14}$/.test(digits) || (digits[0] === '7' && digits.length !== 11)) return null;
  return '+' + digits;
}

function hostedUrl(value, hosts) {
  const text = /^https?:\/\//i.test(value) ? value.replace(/^http:/i, 'https:') : 'https://' + value;
  try {
    const url = new URL(text);
    if (url.username || url.password || /[\s\\]/.test(text)) return null;
    if (hosts && !hosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) return null;
    return url.href;
  } catch { return null; }
}

function validInn(text) {
  if (!/^(?:\d{10}|\d{12})$/.test(text) || /^0+$/.test(text)) return false;
  const digit = weights => weights.reduce((sum, weight, i) => sum + weight * Number(text[i]), 0) % 11 % 10;
  const base = [2, 4, 10, 3, 5, 9, 4, 6, 8];
  if (text.length === 10) return Number(text[9]) === digit(base);
  return Number(text[10]) === digit([7, ...base]) && Number(text[11]) === digit([3, 7, ...base]);
}

function validOgrn(text) {
  if (!/^(?:\d{13}|\d{15})$/.test(text) || /^0+$/.test(text)) return false;
  const divisor = text.length === 13 ? 11 : 13;
  return Number(text.slice(0, -1)) % divisor % 10 === Number(text.slice(-1));
}

function parseField(field, control, legalForm) {
  const text = control.value.trim();
  if (field.key === 'insideWidth') {
    const number = control.valueAsNumber;
    return Number.isInteger(number) && number >= field.min && number <= field.max
      ? { value: number }
      : { error: 'Введите целое число от 185 до 240.' };
  }
  if (!text) return field.required ? { error: 'Заполните это поле.' } : { value: '' };
  if (field.limit && text.length > field.limit) return { error: `Введите не более ${field.limit} символов.` };
  if (field.type === 'email' && (control.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))) {
    return { error: 'Укажите адрес электронной почты с именем и доменом.' };
  }
  if (field.key === 'inn') {
    const requiredLength = legalForm === 'ooo' ? 10 : legalForm ? 12 : 0;
    if (requiredLength && text.length !== requiredLength) return { error: `Для выбранной формы ИНН должен содержать ${requiredLength} цифр.` };
    if (!validInn(text)) return { error: 'Проверьте цифры ИНН и его контрольное число.' };
  }
  if (field.key === 'ogrn') {
    if (legalForm === 'npd') return { value: '' };
    const requiredLength = legalForm === 'ooo' ? 13 : legalForm === 'ip' ? 15 : 0;
    if (requiredLength && text.length !== requiredLength) return { error: `Для выбранной формы номер должен содержать ${requiredLength} цифр.` };
    if (!validOgrn(text)) return { error: 'Проверьте цифры регистрационного номера и его контрольное число.' };
  }
  if (field.key === 'phone' || field.key === 'whatsapp') {
    const value = phoneNumber(text);
    return value ? { value } : { error: 'Проверьте номер, например +7 993 503-19-90.' };
  }
  if (field.key === 'telegram' || field.key === 'channel') {
    const value = telegramUrl(text);
    return value ? { value } : { error: 'Введите @имя или ссылку вида https://t.me/username.' };
  }
  if (field.key === 'max') {
    const value = hostedUrl(text, ['max.ru']);
    return value ? { value } : { error: 'Вставьте ссылку, которая начинается с https://max.ru/' };
  }
  if (field.key === 'vk') {
    const value = hostedUrl(text, ['vk.com', 'vk.ru']);
    return value ? { value } : { error: 'Вставьте ссылку на страницу ВКонтакте: https://vk.com/…' };
  }
  if (field.key === 'mapUrl') {
    const value = hostedUrl(text);
    return value ? { value } : { error: 'Вставьте ссылку на карту целиком, начиная с https://' };
  }
  return { value: text };
}

let editorCount = 0;
const longDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function themePicker(id, state, extended, onChange) {
  const group = document.createElement('fieldset');
  group.id = 'kw-season';
  group.className = 'kw-settings__group kw-theme';
  group.innerHTML = `
    <legend>Оформление сайта</legend>
    <div class="kw-settings__grid">
      <div class="kw-switch-row kw-settings__wide">
        <button type="button" role="switch" class="kw-switch" id="${id}-switch" aria-describedby="${id}-switch-note"><span class="kw-switch__track"><span class="kw-switch__thumb"></span></span><span class="kw-switch__state"></span></button>
        <div class="kw-switch-copy"><label for="${id}-switch">Новогоднее оформление</label>
          <p id="${id}-switch-note">Зимняя обложка, гирлянда в шапке, снег под моделями. Каталог, цены и тексты остаются прежними.</p></div>
      </div>
      <label class="kw-check kw-settings__wide"><input type="checkbox" id="${id}-auto"><span><strong>Включать само по календарю</strong> — с 1 декабря по 14 января. В остальные дни сайт показывает обычное оформление.</span></label>
      <p class="kw-theme__now kw-settings__wide" role="status"></p>
      ${[['classic', 'Обычное'], ['newyear', 'Новогоднее']].map(([value, label]) => `
        <label class="kw-theme__choice kw-theme__${value}">
          <input type="radio" name="${id}-theme" value="${value}">
          <span class="kw-theme__card">
            <span class="kw-theme__preview" aria-hidden="true">
              <span class="kw-theme__screen kw-theme__desktop"><span></span></span>
              <span class="kw-theme__screen kw-theme__mobile"><span></span></span>
            </span>
            <span class="kw-theme__caption"><strong>${label}</strong><i aria-hidden="true"></i></span>
          </span>
        </label>`).join('')}
    </div>`;
  const toggle = group.querySelector('.kw-switch'), auto = group.querySelector(`#${CSS.escape(id + '-auto')}`);
  const inputs = [...group.querySelectorAll('input[type="radio"]')], now = group.querySelector('.kw-theme__now');
  auto.disabled = !extended;
  if (!extended) auto.closest('label').classList.add('kw-locked');
  function sync() {
    const automatic = extended && state.mode === 'auto';
    const shown = automatic ? (isHolidaySeason() ? 'newyear' : 'classic') : state.theme;
    toggle.setAttribute('aria-checked', String(shown === 'newyear'));
    toggle.disabled = automatic;
    toggle.querySelector('.kw-switch__state').textContent = shown === 'newyear' ? 'Включено' : 'Выключено';
    auto.checked = automatic;
    for (const input of inputs) { input.checked = input.value === shown; input.disabled = automatic; }
    const today = longDate.format(new Date());
    now.textContent = automatic
      ? `Календарь включён. Сегодня, ${today}, покупатели видят ${shown === 'newyear' ? 'новогоднее' : 'обычное'} оформление.`
      : `После публикации покупатели увидят ${shown === 'newyear' ? 'новогоднее' : 'обычное'} оформление.`;
  }
  toggle.addEventListener('click', () => { state.theme = state.theme === 'newyear' ? 'classic' : 'newyear'; sync(); onChange(); });
  auto.addEventListener('change', () => { state.mode = auto.checked ? 'auto' : ''; sync(); onChange(); });
  group.addEventListener('change', event => {
    if (inputs.includes(event.target) && event.target.checked) { state.theme = event.target.value; sync(); onChange(); }
  });
  sync();
  return group;
}

// Редактор списка одинаковых блоков: добавить, удалить, поменять порядок.
function listEditor(id, spec, initial, locked, onChange) {
  let rows = initial.map(entry => ({ ...entry }));
  const box = element('div', 'kw-list kw-settings__wide');
  const head = element('div', 'kw-list__head');
  head.append(element('strong', '', spec.title), element('span', 'kw-list__count'));
  const list = element('ol', 'kw-list__items');
  const add = element('button', 'kw-list__add', '+ ' + spec.addLabel);
  add.type = 'button';
  const live = element('p', 'kw-list__status'); live.setAttribute('role', 'status');
  box.append(head);
  if (spec.note) box.append(element('p', 'kw-settings__note', spec.note));
  box.append(list, add, live);
  let serial = 0;

  function emit() { onChange(rows.map(entry => ({ ...entry }))); }
  function render(focusIndex, focusKey) {
    list.replaceChildren(...rows.map((entry, index) => {
      const item = element('li', 'kw-list__item');
      const fields = element('div', 'kw-list__fields');
      for (const field of spec.fields) {
        const controlId = `${id}-${spec.key}-${++serial}`;
        const wrap = element('div', 'kw-settings__field');
        const label = element('label', '', field.label); label.htmlFor = controlId;
        const control = document.createElement(field.multiline ? 'textarea' : 'input');
        control.className = 'kw-settings__control'; control.id = controlId;
        if (field.multiline) control.rows = field.rows || 2; else control.type = 'text';
        control.maxLength = field.limit; control.value = entry[field.key] || ''; control.disabled = locked;
        control.dataset.listKey = field.key;
        const error = element('small', 'kw-settings__error'); error.id = controlId + '-error';
        control.setAttribute('aria-describedby', error.id);
        control.addEventListener('input', () => {
          rows[index] = { ...rows[index], [field.key]: control.value };
          if (field.required) {
            const missing = !control.value.trim();
            control.setAttribute('aria-invalid', String(missing));
            error.textContent = missing ? 'Заполните это поле или удалите блок.' : '';
          }
          emit();
        });
        wrap.append(label, control, error);
        fields.append(wrap);
      }
      const actions = element('div', 'kw-list__actions');
      function action(text, name, handler, disabled) {
        const button = element('button', '', text);
        button.type = 'button'; button.setAttribute('aria-label', `${name}: блок ${index + 1}`); button.title = name;
        button.disabled = locked || disabled; button.addEventListener('click', handler);
        actions.append(button);
      }
      action('↑', 'Поднять выше', () => { [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]]; emit(); render(index - 1); }, index === 0);
      action('↓', 'Опустить ниже', () => { [rows[index + 1], rows[index]] = [rows[index], rows[index + 1]]; emit(); render(index + 1); }, index === rows.length - 1);
      action('Удалить', 'Удалить', () => { rows.splice(index, 1); emit(); render(Math.min(index, rows.length - 1)); live.textContent = 'Блок удалён.'; });
      item.append(fields, actions);
      return item;
    }));
    head.querySelector('.kw-list__count').textContent = rows.length + ' из ' + spec.max;
    add.disabled = locked || rows.length >= spec.max;
    if (focusIndex !== undefined && rows.length) {
      const target = list.children[focusIndex]?.querySelector(focusKey ? `[data-list-key="${focusKey}"]` : 'input,textarea');
      target?.focus();
    } else if (focusIndex !== undefined) add.focus();
  }
  add.addEventListener('click', () => {
    rows.push(Object.fromEntries(spec.fields.map(field => [field.key, ''])));
    render(rows.length - 1, spec.fields[0].key);
    live.textContent = 'Добавлен пустой блок. Заполните его.';
  });
  render();
  return {
    node: box,
    // Пустые блоки без заголовка не сохраняются, поэтому ошибкой считается только заголовок без текста при заполненном втором поле.
    invalid() {
      const first = [...list.querySelectorAll('[aria-invalid="true"]')][0];
      return first || null;
    },
  };
}

export function mountSettings(container, { settings = {}, onChange, section = 'main', extended = true } = {}) {
  const editorId = `kw-settings-${++editorCount}`;
  const panel = document.createElement('section');
  panel.className = 'kw-settings';
  panel.setAttribute('aria-label', 'Настройки сайта');
  const controls = [], lists = [];
  let draft = { ...settings, legal: { ...settings.legal }, extra: { ...settings.extra } };
  const legalControls = new Map();
  const legalForm = () => legalControls.get('form')?.control.value || draft.legal?.form || '';
  const emit = () => onChange?.({ ...draft, legal: { ...draft.legal }, extra: { ...draft.extra } });

  function updateLegalLayout() {
    const ogrn = legalControls.get('ogrn');
    if (!ogrn) return;
    const form = legalForm();
    ogrn.wrapper.hidden = form === 'npd';
    ogrn.control.disabled = ogrn.wrapper.hidden;
    ogrn.label.textContent = form === 'ip' ? 'ОГРНИП' : form === 'ooo' ? 'ОГРН' : 'ОГРН / ОГРНИП';
  }
  function commitLegal() {
    const values = {};
    for (const [key, { field, control }] of legalControls) {
      const result = parseField(field, control, legalForm());
      if (result.error) return;
      values[key] = result.value;
    }
    if (Object.entries(values).every(([key, value]) => (draft.legal?.[key] ?? '') === value)) return;
    draft = { ...draft, legal: { ...draft.legal, ...values } };
    emit();
  }

  const uses = groups.filter(group => group.section === section);
  const needsServer = section === 'design' ? false : uses.some(group => group.lists?.length || group.fields?.some(field => field.scope === 'extra'));
  if (!extended && (needsServer || section === 'design')) {
    const lock = element('p', 'kw-settings__lock');
    lock.append(element('strong', '', 'Часть полей пока закрыта. '),
      'Сервер сайта работает на прежней версии и не хранит эти разделы. Поля с замком станут доступны после обновления сервера — инструкция для разработчика лежит в файле docs/DEPLOY.md.');
    panel.append(lock);
  }

  if (section === 'design') {
    const state = { theme: settings.theme === 'newyear' ? 'newyear' : 'classic', mode: settings.extra?.themeMode === 'auto' ? 'auto' : '' };
    panel.append(themePicker(editorId, state, extended, () => {
      draft = { ...draft, theme: state.theme, extra: { ...draft.extra, themeMode: state.mode } };
      emit();
    }));
  }

  for (const { title, fields = [], lists: listSpecs = [], id: groupId, note } of uses) {
    const group = document.createElement('fieldset');
    group.className = 'kw-settings__group';
    if (groupId) group.id = groupId;
    const legend = document.createElement('legend');
    legend.textContent = title;
    const grid = document.createElement('div');
    grid.className = 'kw-settings__grid';
    if (note) grid.append(element('p', 'kw-settings__note kw-settings__wide', note));
    group.append(legend, grid);
    panel.append(group);

    const disclosures = new Map();
    for (const field of fields) {
      const scope = field.scope || '';
      const locked = scope === 'extra' && !extended;
      let fieldGrid = grid;
      if (field.disclosure) {
        if (!disclosures.has(field.disclosure)) {
          const details = document.createElement('details');
          details.className = 'kw-settings__disclosure kw-settings__wide';
          const summary = document.createElement('summary');
          summary.textContent = field.disclosure;
          const inner = document.createElement('div');
          inner.className = 'kw-settings__grid';
          details.append(summary, inner);
          grid.append(details);
          disclosures.set(field.disclosure, inner);
        }
        fieldGrid = disclosures.get(field.disclosure);
      }
      const id = `${editorId}-${field.key}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'kw-settings__field' + (field.wide ? ' kw-settings__wide' : '') + (locked ? ' kw-locked' : '');
      const label = document.createElement('label');
      label.textContent = field.unit ? `${field.label}, ${field.unit}` : field.label;
      label.htmlFor = id;
      const control = document.createElement(field.options ? 'select' : field.multiline ? 'textarea' : 'input');
      control.className = 'kw-settings__control';
      control.id = id;
      control.name = scope ? scope + '.' + field.key : field.key;
      if (field.options) {
        for (const [value, text] of field.options) control.add(new Option(text, value));
      } else if (field.multiline) control.rows = field.rows || 3;
      else control.type = field.type || 'text';
      if (field.numeric) control.inputMode = 'numeric';
      if (field.key === 'insideWidth') {
        control.min = field.min;
        control.max = field.max;
        control.step = 1;
        control.inputMode = 'numeric';
      }
      if (['phone', 'channel', 'telegram', 'max', 'vk', 'whatsapp', 'mapUrl'].includes(field.key)) {
        control.autocapitalize = 'off';
        control.spellcheck = false;
      }
      control.autocomplete = 'off';
      control.placeholder = field.placeholder || '';
      control.required = Boolean(field.required);
      control.disabled = locked;
      if (field.limit && !field.options) control.maxLength = field.limit;
      control.value = (scope ? settings[scope]?.[field.key] : settings[field.key]) ?? '';
      wrapper.append(label, control);
      const descriptions = [];
      if (field.hint) {
        const hint = document.createElement('small');
        hint.className = 'kw-settings__hint';
        hint.id = `${id}-hint`;
        hint.textContent = field.hint;
        descriptions.push(hint.id);
        wrapper.append(hint);
      }
      let counter;
      if (field.counter && field.limit) {
        counter = element('small', 'kw-settings__counter');
        wrapper.append(counter);
      }
      const error = document.createElement('small');
      error.className = 'kw-settings__error';
      error.id = `${id}-error`;
      error.setAttribute('aria-live', 'polite');
      descriptions.push(error.id);
      wrapper.append(error);
      control.setAttribute('aria-describedby', descriptions.join(' '));
      const count = () => { if (counter) counter.textContent = control.value.length + ' из ' + field.limit; };
      count();

      function check(showError) {
        if (locked) return { value: control.value };
        const result = parseField(field, control, legalForm());
        control.setCustomValidity(result.error || '');
        control.setAttribute('aria-invalid', String(Boolean(showError && result.error)));
        error.textContent = showError && result.error ? result.error : '';
        return result;
      }
      control.addEventListener(field.options ? 'change' : 'input', () => {
        count();
        if (scope === 'legal' && legalControls.has('form')) {
          if (field.key === 'form') {
            updateLegalLayout();
            legalControls.get('inn').check(true);
            legalControls.get('ogrn').check(true);
          }
          check(control.getAttribute('aria-invalid') === 'true');
          commitLegal();
          return;
        }
        const result = check(control.getAttribute('aria-invalid') === 'true');
        if (result.error) return;
        if (scope) {
          if ((draft[scope]?.[field.key] ?? '') === result.value) return;
          draft = { ...draft, [scope]: { ...draft[scope], [field.key]: result.value } };
        } else {
          if (draft[field.key] === result.value) return;
          draft = { ...draft, [field.key]: result.value };
        }
        emit();
      });
      control.addEventListener('blur', () => check(true));
      controls.push({ control, check });
      if (scope === 'legal' && section === 'legal') legalControls.set(field.key, { field, control, check, wrapper, label });
      fieldGrid.append(wrapper);
    }

    for (const spec of listSpecs) {
      const editor = listEditor(editorId, spec, Array.isArray(settings.extra?.[spec.key]) ? settings.extra[spec.key] : [], !extended, rows => {
        // Блоки без заголовка — недописанные черновики. В каталог они не попадают.
        const first = spec.fields[0].key;
        draft = { ...draft, extra: { ...draft.extra, [spec.key]: rows.filter(row => String(row[first] || '').trim()).map(row => Object.fromEntries(spec.fields.map(field => [field.key, String(row[field.key] || '').trim()]))) } };
        emit();
      });
      if (!extended) editor.node.classList.add('kw-locked');
      lists.push(editor);
      grid.append(editor.node);
    }
  }

  updateLegalLayout();
  container.replaceChildren(panel);
  return {
    validate() {
      const invalid = controls.filter(({ control, check }) => !control.disabled && check(true).error);
      const target = invalid[0]?.control || lists.map(list => list.invalid()).find(Boolean);
      if (target) {
        const disclosure = target.closest('details');
        if (disclosure) disclosure.open = true;
        target.focus();
      }
      return !target;
    },
    destroy() { panel.remove(); },
  };
}
