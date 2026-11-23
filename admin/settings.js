const groups = [
  {
    title: 'Первый экран',
    fields: [
      { key: 'brand', label: 'Название компании', placeholder: 'Karkaswood', required: true },
      { key: 'location', label: 'Место просмотра', placeholder: 'Косулино, Свердловская область', required: true },
      { key: 'heading', label: 'Заголовок страницы', placeholder: 'Барн-модуль 2,4 × 5 м', wide: true, required: true },
      { key: 'intro', label: 'Текст под заголовком', multiline: true, wide: true,
        hint: 'В одном-двух предложениях расскажите, что можно посмотреть на сайте.' },
    ],
  },
  {
    title: 'Контакты',
    fields: [
      { key: 'phone', label: 'Телефон для звонков', type: 'tel', placeholder: '+7 (993) 503-19-90',
        hint: 'Для номера другой страны укажите код со знаком +.' },
      { key: 'telegram', label: 'Telegram для заявок', placeholder: '@Karkaswood_ekb',
        hint: 'Имя пользователя или ссылка на личный чат.' },
      { key: 'channel', label: 'Telegram-канал', placeholder: 'https://t.me/karkaswoodstroy',
        hint: 'Имя или публичная ссылка на канал.', wide: true },
    ],
  },
  {
    title: 'Планировка',
    fields: [
      { key: 'insideWidth', label: 'Внутренняя ширина', type: 'number', min: 185, max: 240,
        unit: 'см', required: true, wide: true,
        hint: 'От 185 до 240 см между внутренними стенами. По этому значению рассчитывается проход рядом с кроватью.' },
    ],
  },
  {
    title: 'Реквизиты и обращения',
    scope: 'legal',
    id: 'kw-legal',
    note: 'Заполните сведения, которые хотите разместить на сайте. Каждое поле можно оставить пустым.',
    fields: [
      { key: 'form', label: 'Форма деятельности', wide: true,
        options: [['', 'Не указана'], ['ip', 'Индивидуальный предприниматель'], ['ooo', 'Общество с ограниченной ответственностью'], ['npd', 'Самозанятый (НПД)']] },
      { key: 'name', label: 'Наименование или ФИО', limit: 300, wide: true, hint: 'Укажите полное наименование организации или ФИО исполнителя.' },
      { key: 'inn', label: 'ИНН', numeric: true, hint: '10 цифр у ООО, 12 у ИП и самозанятого.' },
      { key: 'ogrn', label: 'ОГРН / ОГРНИП', numeric: true, hint: '13 цифр у ООО, 15 у ИП.' },
      { key: 'address', label: 'Адрес для обращений', limit: 500, multiline: true, wide: true },
      { key: 'email', label: 'Электронная почта для обращений', limit: 254, type: 'email', wide: true },
      { key: 'regAuthority', label: 'Орган регистрации ИП', limit: 300, wide: true, disclosure: 'Дополнительные сведения',
        hint: 'Наименование регистрирующего органа из выписки ЕГРИП.' },
      { key: 'hours', label: 'Режим работы мастерской', limit: 160, wide: true, disclosure: 'Дополнительные сведения' },
      { key: 'ownerName', label: 'ФИО или наименование владельца сайта', limit: 300, wide: true, disclosure: 'Данные владельца сайта',
        hint: 'Укажите человека или организацию, которой принадлежит сайт.' },
      { key: 'ownerAddress', label: 'Адрес владельца сайта для обращений', limit: 500, multiline: true, wide: true, disclosure: 'Данные владельца сайта' },
      { key: 'ownerEmail', label: 'Электронная почта владельца сайта', limit: 254, type: 'email', wide: true, disclosure: 'Данные владельца сайта' },
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
  if (!/^\+?(?:\d|\(\d+\))(?:[ \u00a0.–-]*(?:\d|\(\d+\)))*$/u.test(value)) return null;
  let digits = value.replace(/\D/g, '');
  if (!value.startsWith('+')) {
    if (digits.length === 10) digits = '7' + digits;
    else if (digits.length === 11 && /^[78]/.test(digits)) digits = '7' + digits.slice(1);
    else return null;
  }
  if (!/^[1-9]\d{6,14}$/.test(digits) || (digits[0] === '7' && digits.length !== 11)) return null;
  return '+' + digits;
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
  if (field.key === 'phone') {
    const value = phoneNumber(text);
    return value ? { value } : { error: 'Проверьте номер, например +7 993 503-19-90.' };
  }
  if (field.key === 'telegram' || field.key === 'channel') {
    const value = telegramUrl(text);
    return value ? { value } : { error: 'Введите @имя или ссылку вида https://t.me/username.' };
  }
  return { value: text };
}

let editorCount = 0;

function themePicker(id, selected, onSelect) {
  const group = document.createElement('fieldset');
  group.id = 'kw-season';
  group.className = 'kw-settings__group kw-theme';
  group.innerHTML = `
    <legend>Оформление сайта</legend>
    <div class="kw-settings__grid">
      <p class="kw-settings__note kw-settings__wide">Выберите оформление. Посетители увидят его после публикации.</p>
      ${[['classic', 'Основное'], ['newyear', 'Новогоднее']].map(([value, label]) => `
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
  const inputs = [...group.querySelectorAll('input')];
  inputs.find(input => input.value === (selected === 'newyear' ? 'newyear' : 'classic')).checked = true;
  group.addEventListener('change', event => {
    if (inputs.includes(event.target) && event.target.checked) onSelect(event.target.value);
  });
  return group;
}

export function mountSettings(container, { settings = {}, onChange } = {}) {
  const editorId = `kw-settings-${++editorCount}`;
  const panel = document.createElement('section');
  panel.className = 'kw-settings';
  panel.setAttribute('aria-label', 'Общие настройки сайта');
  const controls = [];
  let draft = { ...settings };
  const legalControls = new Map();
  const legalForm = () => legalControls.get('form')?.control.value || '';
  function updateLegalLayout() {
    const form = legalForm();
    const ogrn = legalControls.get('ogrn');
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
    onChange?.({ ...draft });
  }
  panel.append(themePicker(editorId, settings.theme, theme => {
    draft = { ...draft, theme };
    onChange?.({ ...draft });
  }));

  for (const { title, fields, scope, id: groupId, note } of groups) {
    const group = document.createElement('fieldset');
    group.className = 'kw-settings__group';
    if (groupId) group.id = groupId;
    const legend = document.createElement('legend');
    legend.textContent = title;
    const grid = document.createElement('div');
    grid.className = 'kw-settings__grid';
    if (note) {
      const explanation = document.createElement('p');
      explanation.className = 'kw-settings__note kw-settings__wide';
      explanation.textContent = note;
      grid.append(explanation);
    }
    group.append(legend, grid);
    panel.append(group);

    const disclosures = new Map();
    for (const field of fields) {
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
      wrapper.className = 'kw-settings__field' + (field.wide ? ' kw-settings__wide' : '');
      const label = document.createElement('label');
      label.textContent = field.unit ? `${field.label}, ${field.unit}` : field.label;
      label.htmlFor = id;
      const control = document.createElement(field.options ? 'select' : field.multiline ? 'textarea' : 'input');
      control.className = 'kw-settings__control';
      control.id = id;
      control.name = scope ? scope + '.' + field.key : field.key;
      if (field.options) {
        for (const [value, text] of field.options) control.add(new Option(text, value));
      } else if (field.multiline) control.rows = 3;
      else control.type = field.type || 'text';
      if (field.numeric) control.inputMode = 'numeric';
      if (field.key === 'insideWidth') {
        control.min = field.min;
        control.max = field.max;
        control.step = 1;
        control.inputMode = 'numeric';
      }
      if (['phone', 'channel', 'telegram'].includes(field.key)) {
        control.autocapitalize = 'off';
        control.spellcheck = false;
      }
      control.autocomplete = 'off';
      control.placeholder = field.placeholder || '';
      control.required = Boolean(field.required);
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
      const error = document.createElement('small');
      error.className = 'kw-settings__error';
      error.id = `${id}-error`;
      error.setAttribute('aria-live', 'polite');
      descriptions.push(error.id);
      wrapper.append(error);
      control.setAttribute('aria-describedby', descriptions.join(' '));

      function check(showError) {
        const result = parseField(field, control, legalForm());
        control.setCustomValidity(result.error || '');
        control.setAttribute('aria-invalid', String(Boolean(showError && result.error)));
        error.textContent = showError && result.error ? result.error : '';
        return result;
      }
      control.addEventListener(field.options ? 'change' : 'input', () => {
        if (scope === 'legal') {
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
        if (!result.error && draft[field.key] !== result.value) {
          draft = { ...draft, [field.key]: result.value };
          onChange?.({ ...draft });
        }
      });
      control.addEventListener('blur', () => check(true));
      controls.push({ control, check });
      if (scope === 'legal') legalControls.set(field.key, { field, control, check, wrapper, label });
      fieldGrid.append(wrapper);
    }
  }

  updateLegalLayout();
  container.replaceChildren(panel);
  return {
    validate() {
      const invalid = controls.filter(({ check }) => check(true).error);
      if (invalid.length) {
        const first = invalid[0].control;
        const disclosure = first.closest('details');
        if (disclosure) disclosure.open = true;
        first.focus();
      }
      return invalid.length === 0;
    },
    destroy() { panel.remove(); },
  };
}
