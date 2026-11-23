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

function inquiryFor(item, selectedWidth, location) {
  const greeting = 'Дмитрий, здравствуйте!';
  if (item?.id === 'house-project') {
    return `${greeting} Хочу обсудить индивидуальный проект дома. Какие данные об участке и будущем доме нужны для первого расчёта?`;
  }
  const name = typeof item?.name === 'string' ? item.name.trim() : '';
  const dimensions = typeof item?.dimensions === 'string' ? item.dimensions.trim() : '';
  const hasBed = (!item || item.id === 'barn-2-4-5') && supportedBedWidths.includes(selectedWidth);
  let interest = 'Хочу приехать к вам в мастерскую и посмотреть ваши работы.';
  if (name) interest = `Меня интересует модель из каталога — ${name}${dimensions ? ' (' + dimensions + ')' : ''}.`;
  else if (hasBed) interest = 'Хочу посмотреть барн-модуль 2,4 × 5 м.';
  const bedQuestion = hasBed ? ` Планирую поставить кровать шириной ${selectedWidth} см. Подскажите точную ширину между стенами внутри модуля?` : '';
  const place = !name && !hasBed && typeof location === 'string' && location.trim() ? ` Место просмотра на сайте — ${location.trim()}.` : '';
  return `${greeting} ${interest}${place}${bedQuestion} Когда можно приехать?`;
}

export function mountContact(settings) {
  if (settings && typeof settings === 'object') siteSettings = { ...defaults, ...settings };
  if (showContact) return showContact;

  const styles = document.createElement('style');
  styles.textContent = `
    html.kw-contact-active { overflow: hidden; }
    .kw-contact-dialog {
      box-sizing: border-box; width: min(460px, calc(100% - 24px)); max-width: none;
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
    .kw-contact-desc { color: #525750; margin: 0 0 22px; }
    .kw-contact-dialog button, .kw-contact-dialog a { font-family: inherit; touch-action: manipulation; }
    .kw-contact-close { position: absolute; top: 12px; right: 12px; display: grid; place-items: center;
      width: 44px; height: 44px; border-radius: 50%; border: 0; background: transparent;
      color: #353933; cursor: pointer; padding: 0; }
    .kw-contact-close:hover { background: #eae8de; }
    .kw-contact-message { background: #f0ede4; border: 1px solid #e4dfd3; border-radius: 9px;
      padding: 16px; margin: 0 0 18px; }
    .kw-contact-dialog .kw-contact-draft { color: #30352f; font-size: 15px; margin: 0; user-select: text; }
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
      <h2 class="kw-contact-heading" id="kw-contact-heading">Запись на просмотр</h2>
      <p class="kw-contact-desc" id="kw-contact-desc">Напишите Дмитрию, чтобы договориться о времени. Текст можно изменить в Telegram.</p>
      <div class="kw-contact-message">
        <p class="kw-contact-draft"></p>
        <button type="button" class="kw-contact-copy">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7.2" y="7" width="9.4" height="10.3" rx="1.6"/><path d="M5.1 13.3h-.8a1.5 1.5 0 0 1-1.5-1.5V4a1.5 1.5 0 0 1 1.5-1.5h7.2A1.5 1.5 0 0 1 13 4v1"/></svg>
          <span>Скопировать текст</span>
        </button>
      </div>
      <a class="kw-contact-primary" target="_blank" rel="noopener noreferrer" autofocus>
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

  let opener;
  showContact = (trigger, item) => {
    if (dialog.open) return;
    const bedWidth = document.documentElement.dataset.selectedBedWidth;
    const inquiry = inquiryFor(item, bedWidth, siteSettings.location);
    const telegram = telegramProfile(siteSettings.telegram);
    const phone = normalizePhone(siteSettings.phone);
    primary.hidden = !telegram;
    phoneLink.hidden = !phone;
    primary.removeAttribute('href');
    phoneLink.removeAttribute('href');
    if (telegram) {
      telegram.searchParams.set('text', inquiry);
      primary.href = telegram.href;
    }
    if (phone) {
      const formatted = phone.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 $1 $2-$3-$4');
      phoneLink.href = 'tel:' + phone;
      phoneLink.setAttribute('aria-label', 'Позвонить Дмитрию по номеру ' + formatted);
      phoneLabel.textContent = formatted;
    } else {
      phoneLink.removeAttribute('aria-label');
      phoneLabel.textContent = '';
    }
    heading.textContent = item?.id === 'house-project' ? 'Обсудить проект дома' : 'Запись на просмотр';
    description.textContent = telegram ? 'Напишите Дмитрию. Текст сообщения можно изменить в Telegram.'
      : phone ? 'Позвоните Дмитрию, чтобы обсудить детали.' : 'Контакты мастерской пока не указаны.';
    draft.textContent = inquiry;
    opener = trigger instanceof HTMLElement ? trigger : document.activeElement;
    copyLabel.textContent = 'Скопировать текст';
    announcement.textContent = '';
    dialog.showModal();
    (telegram ? primary : phone ? phoneLink : copy).focus({ preventScroll: true });
    document.documentElement.classList.add('kw-contact-active');
  };
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('kw-contact-active');
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
