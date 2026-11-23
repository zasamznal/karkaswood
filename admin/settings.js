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

function parseField(field, control) {
  const text = control.value.trim();
  if (field.key === 'insideWidth') {
    const number = control.valueAsNumber;
    return Number.isInteger(number) && number >= field.min && number <= field.max
      ? { value: number }
      : { error: 'Введите целое число от 185 до 240.' };
  }
  if (!text) return field.required ? { error: 'Заполните это поле.' } : { value: '' };
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

export function mountSettings(container, { settings = {}, onChange } = {}) {
  const editorId = `kw-settings-${++editorCount}`;
  const panel = document.createElement('section');
  panel.className = 'kw-settings';
  panel.setAttribute('aria-label', 'Общие настройки сайта');
  const controls = [];
  let draft = { ...settings };

  for (const { title, fields } of groups) {
    const group = document.createElement('fieldset');
    group.className = 'kw-settings__group';
    const legend = document.createElement('legend');
    legend.textContent = title;
    const grid = document.createElement('div');
    grid.className = 'kw-settings__grid';
    group.append(legend, grid);
    panel.append(group);

    for (const field of fields) {
      const id = `${editorId}-${field.key}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'kw-settings__field' + (field.wide ? ' kw-settings__wide' : '');
      const label = document.createElement('label');
      label.textContent = field.unit ? `${field.label}, ${field.unit}` : field.label;
      label.htmlFor = id;
      const control = document.createElement(field.multiline ? 'textarea' : 'input');
      control.className = 'kw-settings__control';
      control.id = id;
      control.name = field.key;
      if (field.multiline) control.rows = 3;
      else control.type = field.type || 'text';
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
      control.value = settings[field.key] ?? '';
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
        const result = parseField(field, control);
        control.setCustomValidity(result.error || '');
        control.setAttribute('aria-invalid', String(Boolean(showError && result.error)));
        error.textContent = showError && result.error ? result.error : '';
        return result;
      }
      control.addEventListener('input', () => {
        const result = check(control.getAttribute('aria-invalid') === 'true');
        if (!result.error && draft[field.key] !== result.value) {
          draft = { ...draft, [field.key]: result.value };
          onChange?.({ ...draft });
        }
      });
      control.addEventListener('blur', () => check(true));
      controls.push({ control, check });
      grid.append(wrapper);
    }
  }

  container.replaceChildren(panel);
  return {
    validate() {
      const invalid = controls.filter(({ check }) => check(true).error);
      invalid[0]?.control.focus();
      return invalid.length === 0;
    },
    destroy() { panel.remove(); },
  };
}
