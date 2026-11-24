const supportedBedWidths = ['90', '140', '160'];
const defaults = {
  location: 'Косулино, Свердловская область',
  phone: '+79935031990',
  telegram: 'https://t.me/Karkaswood_ekb',
};

let showContact;
let siteSettings = defaults;

function telegramProfile(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(?:@?([a-z][a-z\d_]{3,30}[a-z\d])|(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([a-z][a-z\d_]{3,30}[a-z\d])\/?)$/i);
  if (!match) return null;
  const username = match[1] || match[2];
  if (/^(addemoji|addlist|addstickers|addtheme|boost|confirmphone|contact|folder|giftcode|invoice|joinchat|login|proxy|setlanguage|share|socks|suggestedpost|tonsite)$/i.test(username)) return null;
  return new URL('https://t.me/' + username);
}

function normalizePhone(value) {
  if (typeof value !== 'string' || !/^\+?[\d\s().–-]+$/.test(value.trim())) return '';
  let digits = value.replace(/\D/g, '');
  if (!value.trim().startsWith('+')) {
    if (digits.length === 10) digits = '7' + digits;
    else if (/^[78]\d{10}$/.test(digits)) digits = '7' + digits.slice(1);
    else return '';
  }
  if (!/^[1-9]\d{6,14}$/.test(digits) || (digits[0] === '7' && digits.length !== 11)) return '';
  return '+' + digits;
}

function projectsFor(selection) {
  const candidates = Array.isArray(selection) ? selection : Array.isArray(selection?.items) ? selection.items : [selection];
  const seen = new Set();
  return candidates.filter(item => {
    if (!item || (item.id !== 'house-project' && (typeof item.name !== 'string' || !item.name.trim()))) return false;
    const key = item.id || item.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function projectLabel(item) {
  const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Индивидуальный проект дома';
  const size = typeof item.dimensions === 'string' ? item.dimensions.trim() : '';
  return size ? `${name} (${size})` : name;
}

function inquiryFor(projects, selectedWidth, topic, town, location) {
  const comparing = projects.length > 1;
  const house = projects.length === 1 && projects[0].id === 'house-project';
  const barn = projects.find(item => (item.tourId ?? item.id) === 'barn-2-4-5');
  const hasBed = supportedBedWidths.includes(selectedWidth) && (barn || !projects.length);
  let subject;
  if (comparing) subject = `Сравниваю проекты из вашего каталога.\n${projects.map(item => '• ' + projectLabel(item)).join('\n')}`;
  else if (house) subject = 'Хочу обсудить индивидуальный проект дома.';
  else if (projects.length) subject = `Меня интересует модель из каталога — ${projectLabel(projects[0])}.`;
  else if (hasBed) subject = 'Хочу узнать о барн-модуле 2,4 × 5 м.';
  else {
    subject = 'Хочу подобрать проект в вашей мастерской.';
    if (topic !== 'visit' && typeof location === 'string' && location.trim()) subject += ` Место просмотра на сайте — ${location.trim()}.`;
  }

  let question;
  if (topic === 'visit') {
    question = comparing ? 'Какие из этих проектов можно увидеть вживую и когда можно приехать?' : 'Когда можно приехать на просмотр и какие готовые работы можно увидеть?';
    if (typeof location === 'string' && location.trim()) question += ` Место просмотра на сайте — ${location.trim()}.`;
  } else if (topic === 'equipment') {
    question = comparing ? 'Чем отличаются базовые комплектации и какие работы оплачиваются отдельно?' : 'Что входит в базовую комплектацию и какие работы оплачиваются отдельно?';
  } else if (house) {
    question = 'Какие данные об участке и пожелания к дому нужны для предварительного расчёта стоимости?';
  } else {
    question = comparing ? 'Подскажите актуальную цену каждого проекта в базовой комплектации и основные различия между ними.' : 'Подскажите актуальную стоимость и что входит в базовую комплектацию.';
  }
  const parts = ['Дмитрий, здравствуйте! ' + subject, question];
  if (hasBed) parts.push(`Для барн-модуля планирую кровать шириной ${selectedWidth} см. Подскажите точную ширину между стенами внутри модуля?`);
  const area = town.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (area) parts.push(`Место доставки — ${area}. Сколько будет стоить доставка?`);
  return parts.join('\n\n');
}

export function mountContact(settings) {
  if (settings && typeof settings === 'object') siteSettings = { ...defaults, ...settings };
  if (showContact) return showContact;

  const styles = document.createElement('style');
  styles.textContent = `
    html.kw-contact-active { overflow: hidden; }
    .kw-contact-dialog {
      box-sizing: border-box; width: min(520px, calc(100% - 24px)); max-width: none;
      max-height: calc(100% - 24px); max-height: calc(100dvh - 24px);
      margin: auto; overflow-y: auto; overscroll-behavior: contain;
      padding: 0; border: 1px solid #c9c2b6; border-radius: 16px;
      color: #242824; background: #faf8f2; text-align: left;
      box-shadow: 0 24px 80px #171c1b42; font-family: inherit;
    }
    .kw-contact-dialog::backdrop { background: rgb(22 24 21 / 62%); }
    .kw-contact-dialog, .kw-contact-dialog * { box-sizing: border-box; }
    .kw-contact-inner { padding: clamp(24px, 5vw, 36px); position: relative; }
    .kw-contact-heading { font: inherit; font-size: clamp(25px, 5vw, 34px); font-weight: 600;
      letter-spacing: -.045em; line-height: 1.1; margin: 0 38px 14px 0; color: inherit; text-transform: none; }
    .kw-contact-dialog p { font-size: 15px; line-height: 1.5; letter-spacing: normal; }
    .kw-contact-desc { color: #525750; margin: 0 0 18px; }
    .kw-contact-fields { display: grid; gap: 12px; margin-bottom: 18px; }
    .kw-contact-fields label { display: grid; gap: 5px; margin: 0; color: #30352f; font-size: 14px; line-height: 1.4; font-weight: 600; }
    .kw-contact-fields label small { color: #5e635c; font-size: 12px; font-weight: 400; }
    .kw-contact-fields input, .kw-contact-fields select { width: 100%; min-width: 0; min-height: 44px;
      padding: 8px 10px; border: 1px solid #aaa99b; border-radius: 6px; background: #fffefa;
      color: #242824; font: inherit; font-size: 16px; font-weight: 400; }
    .kw-contact-fields input::placeholder { color: #6b7069; opacity: 1; }
    .kw-contact-preview-label { display: block; font-size: 13px; color: #555b52; margin: 0 0 8px; font-weight: 600; }
    .kw-contact-dialog button, .kw-contact-dialog a { font-family: inherit; touch-action: manipulation; }
    .kw-contact-close { position: absolute; top: 12px; right: 12px; display: grid; place-items: center;
      width: 44px; height: 44px; border-radius: 50%; border: 0; background: transparent;
      color: #353933; cursor: pointer; padding: 0; }
    .kw-contact-close:hover { background: #eae8de; }
    .kw-contact-message { background: #f0ede4; border: 1px solid #e4dfd3; border-radius: 9px;
      padding: 16px; margin: 0 0 18px; }
    .kw-contact-dialog .kw-contact-draft { color: #30352f; font-size: 15px; margin: 0; user-select: text;
      white-space: pre-line; overflow-wrap: anywhere; }
    .kw-contact-copy { display: inline-flex; align-items: center; gap: 7px; padding: 8px 0;
      margin: 4px 0 -5px; min-height: 40px; border: 0; font-size: 13px; font-weight: 600; line-height: 1.25;
      cursor: pointer; background: transparent; color: #84442d; }
    .kw-contact-copy:hover { text-decoration: underline; text-underline-offset: 3px; }
    .kw-contact-primary, .kw-contact-phone { display: flex; align-items: center;
      justify-content: center; gap: 10px; border-radius: 7px; min-height: 48px; padding: 10px 16px;
      text-decoration: none; font-size: 15px; line-height: 1.3; font-weight: 600; }
    .kw-contact-dialog .kw-contact-primary { background: #964b31; color: white; }
    .kw-contact-dialog .kw-contact-primary:hover { background: #7e3e27; }
    .kw-contact-dialog .kw-contact-phone { color: #30352f; margin: 6px 0 -10px; }
    .kw-contact-dialog .kw-contact-phone:hover { text-decoration: underline; text-underline-offset: 4px; }
    .kw-contact-dialog [hidden] { display: none; }
    .kw-contact-dialog :focus-visible { outline: 3px solid #a85635; outline-offset: 3px; }
    .kw-contact-dialog svg { flex: none; display: inline-block; }
    .kw-contact-announcement { position: absolute; width: 1px; height: 1px;
      overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  `;
  document.head.append(styles);

  const dialog = document.createElement('dialog');
  dialog.className = 'kw-contact-dialog';
  dialog.setAttribute('aria-labelledby', 'kw-contact-heading');
  dialog.setAttribute('aria-describedby', 'kw-contact-desc');
  dialog.innerHTML = `
    <div class="kw-contact-inner">
      <button type="button" class="kw-contact-close" aria-label="Закрыть окно">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m5 5 10 10m0-10L5 15"/></svg>
      </button>
      <h2 class="kw-contact-heading" id="kw-contact-heading" tabindex="-1" autofocus>Запрос в мастерскую</h2>
      <p class="kw-contact-desc" id="kw-contact-desc"></p>
      <div class="kw-contact-fields">
        <label>Что хотите уточнить?
          <select name="quote-topic">
            <option value="price">Цена и базовая комплектация</option>
            <option value="equipment">Комплектация и доплаты</option>
            <option value="visit">Время просмотра</option>
          </select>
        </label>
        <label><span>Куда нужна доставка? <small>Необязательно</small></span>
          <input type="text" name="quote-town" maxlength="80" autocomplete="off" placeholder="Город или посёлок">
        </label>
      </div>
      <div class="kw-contact-message">
        <strong class="kw-contact-preview-label">Ваше сообщение Дмитрию</strong>
        <p class="kw-contact-draft"></p>
        <button type="button" class="kw-contact-copy">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7.2" y="7" width="9.4" height="10.3" rx="1.6"/><path d="M5.1 13.3h-.8a1.5 1.5 0 0 1-1.5-1.5V4a1.5 1.5 0 0 1 1.5-1.5h7.2A1.5 1.5 0 0 1 13 4v1"/></svg>
          <span>Скопировать текст</span>
        </button>
      </div>
      <a class="kw-contact-primary" target="_blank" rel="noopener noreferrer">
        Открыть Telegram
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 15 15 4M5 4h10v10"/></svg>
      </a>
      <a class="kw-contact-phone">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M7.3 3.2 4.9 3c-1.2 0-2.1 1-2 2.2.8 8.1 7.6 14.9 15.8 15.8 1.3.1 2.3-.8 2.3-2l-.3-2.4-5-2.2-1.8 1.9a17.4 17.4 0 0 1-6.5-6.5l2-1.8-2.1-4.8Z"/></svg>
        <span></span>
      </a>
      <span class="kw-contact-announcement" role="status"></span>
    </div>`;
  document.body.append(dialog);

  const draft = dialog.querySelector('.kw-contact-draft');
  const copy = dialog.querySelector('.kw-contact-copy');
  const copyLabel = copy.querySelector('span');
  const announcement = dialog.querySelector('[role="status"]');
  const primary = dialog.querySelector('.kw-contact-primary');
  const phoneLink = dialog.querySelector('.kw-contact-phone');
  const phoneLabel = phoneLink.querySelector('span');
  const heading = dialog.querySelector('.kw-contact-heading');
  const description = dialog.querySelector('.kw-contact-desc');
  const topic = dialog.querySelector('[name="quote-topic"]');
  const town = dialog.querySelector('[name="quote-town"]');

  let opener;
  let projects = [];
  let bedWidth;
  let telegram;
  function refreshDraft() {
    draft.textContent = inquiryFor(projects, bedWidth, topic.value, town.value, siteSettings.location);
    copyLabel.textContent = 'Скопировать текст';
    announcement.textContent = '';
  }
  topic.addEventListener('change', refreshDraft);
  town.addEventListener('input', refreshDraft);

  // Keep the delivery town out of outgoing URLs until the visitor opens Telegram.
  function prepareTelegramLink() {
    if (!telegram || !dialog.open) return;
    const target = new URL(telegram);
    target.searchParams.set('text', draft.textContent);
    primary.href = target.href;
    setTimeout(() => {
      if (dialog.open && telegram) primary.href = telegram.href;
    }, 0);
  }
  primary.addEventListener('click', prepareTelegramLink);
  primary.addEventListener('auxclick', event => {
    if (event.button === 1) prepareTelegramLink();
  });

  showContact = (trigger, selection) => {
    if (dialog.open) return;
    projects = projectsFor(selection);
    bedWidth = document.documentElement.dataset.selectedBedWidth;
    telegram = telegramProfile(siteSettings.telegram);
    const phone = normalizePhone(siteSettings.phone);
    primary.hidden = !telegram;
    phoneLink.hidden = !phone;
    primary.removeAttribute('href');
    phoneLink.removeAttribute('href');
    if (telegram) primary.href = telegram.href;
    if (phone) {
      const formatted = phone.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 $1 $2-$3-$4');
      phoneLink.href = 'tel:' + phone;
      phoneLink.setAttribute('aria-label', 'Позвонить Дмитрию по номеру ' + formatted);
      phoneLabel.textContent = formatted;
    } else {
      phoneLink.removeAttribute('aria-label');
      phoneLabel.textContent = '';
    }
    topic.value = trigger instanceof Element && (trigger.dataset.contact === 'visit' || /просмотр|приехать/i.test(trigger.textContent)) ? 'visit' : 'price';
    town.value = '';
    heading.textContent = projects.length > 1 ? 'Сравнить проекты' : projects[0]?.id === 'house-project' ? 'Обсудить проект дома'
      : topic.value === 'visit' ? 'Запись на просмотр' : 'Запросить расчёт';
    description.textContent = telegram ? 'Черновик создаётся в вашем браузере. Кнопка «Открыть Telegram» перенесёт текст в чат. Отправьте его, когда будете готовы.'
      : phone ? 'Подготовьте вопросы в этом окне. Текст можно скопировать, а детали обсудить с Дмитрием по телефону.' : 'Черновик можно скопировать. Контакты мастерской пока не указаны.';
    refreshDraft();
    opener = trigger instanceof HTMLElement ? trigger : document.activeElement;
    dialog.showModal();
    heading.focus({ preventScroll: true });
    dialog.scrollTop = 0;
    document.documentElement.classList.add('kw-contact-active');
  };
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    document.documentElement.classList.remove('kw-contact-active');
    town.value = '';
    draft.textContent = '';
    primary.removeAttribute('href');
    projects = [];
    bedWidth = undefined;
    telegram = null;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  dialog.querySelector('.kw-contact-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  copy.addEventListener('click', async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(draft.textContent);
      copied = true;
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(draft);
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        copied = document.execCommand('copy');
      } catch {
        // The selected message remains available via the system copy action.
      }
      if (copied) selection.removeAllRanges();
    }
    const message = copied ? 'Текст скопирован' : 'Скопируйте выделенный текст';
    copyLabel.textContent = message;
    announcement.textContent = message;
  });
  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element && event.target.closest('[data-contact]');
    if (!trigger || event.defaultPrevented) return;
    event.preventDefault();
    showContact(trigger);
  });
  return showContact;
}
