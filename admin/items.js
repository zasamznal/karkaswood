import { tourTemplates } from '../assets/tour-registry.js';

const categories = new Map([
  ['utility', 'Хозблоки'],
  ['bath', 'Бани'],
  ['cabin', 'Бытовки'],
  ['house', 'Дома'],
]);
const tourNames = new Map(Object.entries(tourTemplates));
const maxPhotoBytes = 150000;
const uploadedPhoto = /^data:image\/(?:webp|jpeg);base64,[a-z\d+/]+=*$/i;
const rubles = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
const siteRoot = new URL('../', import.meta.url);
const cssUrl = new URL('items.css', import.meta.url).href;

function externalUrl(value, allowLocal = false) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return '';
  try {
    const url = new URL(value);
    const allowed = url.protocol === 'https:' || (allowLocal && url.origin === siteRoot.origin);
    return allowed && url.hostname && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

function photoUrl(value) {
  if (typeof value !== 'string' || !value) return '';
  if (value.startsWith('data:')) {
    return value.length <= 200030 && uploadedPhoto.test(value) ? value : '';
  }
  const external = externalUrl(value, true);
  if (external) return external;
  if (!/^(?:\.{0,2}\/)?[\p{L}\d_ -]+\/[\p{L}\d_ .%/-]+$/u.test(value)) return '';
  const path = value.replace(/^(?:\.\.\/|\.\/|\/)/, '');
  if (path.split('/').some(segment => segment === '..')) return '';
  try {
    const url = new URL(path, siteRoot);
    return url.origin === siteRoot.origin && url.pathname.startsWith(siteRoot.pathname) ? url.href : '';
  } catch {
    return '';
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, className) {
  const node = element('button', className, label);
  node.type = 'button';
  return node;
}

function options(select, emptyLabel) {
  if (emptyLabel) select.add(new Option(emptyLabel, ''));
  for (const [value, label] of categories) select.add(new Option(label, value));
}

function syncImage(box, value) {
  box.replaceChildren();
  const src = photoUrl(value);
  if (!src) {
    box.textContent = 'Без фото';
    return;
  }
  const img = element('img');
  img.alt = '';
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('error', () => { if (box.contains(img)) box.textContent = 'Фото недоступно'; }, { once: true });
  img.src = src;
  box.append(img);
}

async function compressPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
    throw new Error('Выберите файл JPG, PNG, WebP или AVIF.');
  }
  if (file.size > 20 * 1024 * 1024) throw new Error('Выберите изображение размером до 20 МБ.');
  const source = new Image();
  const objectUrl = URL.createObjectURL(file);
  try {
    source.src = objectUrl;
    await source.decode();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Не удалось подготовить фото.');
    for (let edge = 1000; edge >= 240; edge = Math.floor(edge * 0.75)) {
      const scale = Math.min(1, edge / Math.max(source.naturalWidth, source.naturalHeight));
      canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
      context.fillStyle = '#f4f1e9';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.84, 0.65, 0.45]) {
        let blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
        if (!blob || blob.type !== 'image/webp') {
          blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        }
        if (blob && ['image/jpeg', 'image/webp'].includes(blob.type) && blob.size <= maxPhotoBytes) {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Не удалось прочитать фото.'));
            reader.readAsDataURL(blob);
          });
        }
      }
    }
    throw new Error('Не удалось уменьшить фото. Попробуйте другой файл.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function mountItems(container, { items = [], onChange } = {}) {
  if (!Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(link => link.href === cssUrl)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    document.head.append(link);
  }
  let records = items.map(item => ({ ...item }));
  let editor;
  let pendingRemoval;
  const root = element('div', 'kwitems-root');
  root.innerHTML = `
    <div class="kwitems-browser">
      <div class="kwitems-toolbar">
        <label class="kwitems-field kwitems-search">Поиск по карточкам<input type="search" placeholder="Название, размер или описание"></label>
        <label class="kwitems-field">Раздел<select class="kwitems-filter"></select></label>
        <button type="button" class="kwitems-primary kwitems-add">Добавить карточку</button>
      </div>
      <p class="kwitems-count"></p>
      <ul class="kwitems-list" aria-label="Карточки каталога"></ul>
    </div>
    <div class="kwitems-editor" hidden></div>
    <p class="kwitems-status" role="status"></p>`;
  container.replaceChildren(root);
  const browser = root.querySelector('.kwitems-browser');
  const search = root.querySelector('input[type="search"]');
  const filter = root.querySelector('.kwitems-filter');
  const add = root.querySelector('.kwitems-add');
  const list = root.querySelector('.kwitems-list');
  const count = root.querySelector('.kwitems-count');
  const panel = root.querySelector('.kwitems-editor');
  const status = root.querySelector('.kwitems-status');
  options(filter, 'Все разделы');

  function commit(next, message) {
    records = next;
    pendingRemoval = undefined;
    onChange?.(records.map(item => ({ ...item })));
    renderList();
    status.textContent = message;
  }

  function closeEditor() {
    clearTimeout(editor?.photoTimer);
    const returnTo = editor?.opener;
    editor = undefined;
    panel.hidden = true;
    panel.replaceChildren();
    browser.hidden = false;
    (returnTo?.isConnected && browser.contains(returnTo) ? returnTo : add).focus();
  }

  function edit(item) {
    const form = element('form', 'kwitems-form');
    form.innerHTML = `
      <header class="kwitems-form-header"><h3></h3><button type="button" class="kwitems-back">К каталогу</button></header>
      <div class="kwitems-edit-grid">
        <div class="kwitems-edit-fields">
          <div class="kwitems-tabs" role="tablist" aria-label="Разделы карточки">
            <button type="button" role="tab" aria-selected="true" data-kw-tab="main">О постройке</button>
            <button type="button" role="tab" aria-selected="false" data-kw-tab="media" tabindex="-1">Фото и 3D</button>
          </div>
          <div role="tabpanel" data-kw-page="main" class="kwitems-fields">
            <label class="kwitems-field kwitems-wide">Название<input name="name" type="text" required maxlength="120" placeholder="Например, Барн-модуль"></label>
            <label class="kwitems-field">Раздел<select name="category"></select></label>
            <label class="kwitems-field">Размеры<input name="dimensions" type="text" maxlength="80" placeholder="2,4 × 5 м"></label>
            <label class="kwitems-field">Цена, ₽<input name="price" type="number" inputmode="numeric" min="1" step="1" placeholder="По запросу"></label>
            <label class="kwitems-field kwitems-wide">Описание<textarea name="summary" rows="3" maxlength="1200" placeholder="Материалы, планировка, особенности проекта"></textarea></label>
            <label class="kwitems-publish kwitems-wide"><input name="published" type="checkbox">Показывать в каталоге</label>
          </div>
          <div role="tabpanel" data-kw-page="media" class="kwitems-fields" hidden>
            <label class="kwitems-field kwitems-wide">Фотография постройки<input name="upload" type="file" accept="image/jpeg,image/png,image/webp,image/avif"><small>JPG, PNG, WebP или AVIF до 20 МБ</small></label>
            <div class="kwitems-photo-actions kwitems-wide"><button type="button" class="kwitems-remove-photo">Убрать фото</button><span class="kwitems-photo-status" role="status"></span></div>
            <details class="kwitems-links kwitems-wide"><summary>Ссылка на фото и источник</summary>
              <label class="kwitems-field">Ссылка на фото<input name="photo" type="text" maxlength="2048" placeholder="https://…"></label>
              <label class="kwitems-field">Ссылка на публикацию<input name="source" type="url" maxlength="2048" placeholder="https://t.me/…"></label>
            </details>
            <label class="kwitems-field kwitems-wide">3D-модель<select name="tourId"></select><small>Выберите модель, только если постройка ей соответствует.</small></label>
          </div>
        </div>
        <details class="kwitems-live">
          <summary>Предпросмотр карточки</summary>
          <div class="kwitems-card-preview">
            <div class="kwitems-card-image"><div class="kwitems-preview"></div><span class="kwitems-live-tour" hidden>Обзор в 3D</span></div>
            <div class="kwitems-card-copy">
              <div class="kwitems-live-meta"><span data-kw-live="category"></span><span data-kw-live="dimensions"></span></div>
              <h4 data-kw-live="name"></h4><strong data-kw-live="price"></strong>
              <p data-kw-live="summary"></p><span class="kwitems-badge" data-kw-live="visibility"></span>
            </div>
          </div>
        </details>
      </div>
      <div class="kwitems-form-actions"><button class="kwitems-primary" type="submit">Сохранить карточку</button><button type="button" class="kwitems-cancel">Отмена</button></div>`;
    const original = item || {};
    const fields = form.elements;
    const context = { task: 0, dirty: false, photo: original.photo || '', busy: false, opener: document.activeElement };
    editor = context;
    status.textContent = '';
    form.querySelector('h3').textContent = item ? 'Редактирование карточки' : 'Новая карточка';
    options(fields.category);
    const inheritedTour = tourNames.has(original.id) ? original.id : '';
    fields.tourId.add(new Option('Без 3D-модели', 'none'));
    for (const [id, name] of tourNames) fields.tourId.add(new Option(name, id));
    const initialTour = original.tourId === 'none' ? 'none' : original.tourId || inheritedTour;
    fields.tourId.value = tourNames.has(initialTour) ? initialTour : 'none';
    const tabs = Array.from(form.querySelectorAll('[data-kw-tab]'));
    const pages = Array.from(form.querySelectorAll('[data-kw-page]'));
    const suffix = crypto.randomUUID();
    tabs.forEach((tab, index) => {
      tab.id = 'kw-tab-' + suffix + index;
      pages[index].id = 'kw-page-' + suffix + index;
      tab.setAttribute('aria-controls', pages[index].id);
      pages[index].setAttribute('aria-labelledby', tab.id);
    });
    function switchTab(key, focus = false) {
      tabs.forEach((tab, index) => {
        const active = tab.dataset.kwTab === key;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        pages[index].hidden = !active;
        if (active && focus) tab.focus();
      });
    }
    tabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.kwTab));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const first = event.key === 'Home' || (event.key !== 'End' && tab !== tabs[0]);
        switchTab(first ? 'main' : 'media', true);
      });
    });
    form.querySelector('.kwitems-live').open = root.clientWidth > 730;
    form.addEventListener('invalid', event => {
      const group = event.target.closest('[data-kw-page]');
      if (group) switchTab(group.dataset.kwPage);
      const disclosure = event.target.closest('details');
      if (disclosure) disclosure.open = true;
    }, true);
    fields.category.value = categories.has(original.category) ? original.category : filter.value || 'utility';
    for (const key of ['name', 'dimensions', 'summary', 'source']) fields[key].value = original[key] || '';
    fields.price.value = original.price ?? '';
    fields.published.checked = original.published !== false;
    fields.photo.value = context.photo.startsWith('data:') ? '' : context.photo;
    const preview = form.querySelector('.kwitems-preview');
    const message = form.querySelector('.kwitems-photo-status');
    const remove = form.querySelector('.kwitems-remove-photo');
    const save = form.querySelector('button[type="submit"]');
    const live = Object.fromEntries(Array.from(form.querySelectorAll('[data-kw-live]'), node => [node.dataset.kwLive, node]));
    function updateCardText() {
      live.category.textContent = categories.get(fields.category.value) || '';
      live.dimensions.textContent = fields.dimensions.value.trim();
      live.name.textContent = fields.name.value.trim() || 'Название постройки';
      live.summary.textContent = fields.summary.value.trim();
      const price = fields.price.valueAsNumber;
      live.price.textContent = Number.isSafeInteger(price) && price > 0 ? rubles.format(price) : 'Цена по запросу';
      live.visibility.textContent = fields.published.checked ? 'Показана в каталоге' : 'Скрыта из каталога';
      live.visibility.classList.toggle('kwitems-visible', fields.published.checked);
      form.querySelector('.kwitems-live-tour').hidden = !tourNames.has(fields.tourId.value);
    }
    updateCardText();
    let lastPhoto;
    function updatePreview() {
      clearTimeout(context.photoTimer);
      if (lastPhoto !== context.photo) {
        syncImage(preview, context.photo);
        lastPhoto = context.photo;
      }
      remove.disabled = !context.photo && !context.busy;
    }
    function setBusy(value) {
      context.busy = value;
      save.disabled = value;
    }
    function cancel() {
      if (!context.dirty || window.confirm('Выйти из карточки и отменить изменения?')) closeEditor();
    }
    function applyPhotoUrl() {
      const value = fields.photo.value.trim();
      fields.photo.setCustomValidity(value && !photoUrl(value) ? 'Введите прямую HTTPS-ссылку на изображение.' : '');
      return fields.photo.validity.valid;
    }
    updatePreview();
    form.addEventListener('input', () => { context.dirty = true; updateCardText(); });
    fields.name.addEventListener('input', () => fields.name.setCustomValidity(''));
    fields.price.addEventListener('input', () => fields.price.setCustomValidity(''));
    fields.source.addEventListener('input', () => fields.source.setCustomValidity(''));
    fields.photo.addEventListener('input', () => {
      context.task++;
      setBusy(false);
      fields.upload.value = '';
      context.photo = fields.photo.value.trim();
      message.textContent = '';
      applyPhotoUrl();
      clearTimeout(context.photoTimer);
      if (context.photo && fields.photo.validity.valid) {
        context.photoTimer = setTimeout(updatePreview, 250);
      } else {
        updatePreview();
      }
    });
    fields.photo.addEventListener('change', updatePreview);
    fields.upload.addEventListener('change', async () => {
      const file = fields.upload.files[0];
      if (!file) return;
      const task = ++context.task;
      setBusy(true);
      remove.disabled = false;
      message.textContent = 'Подготавливаем фото…';
      try {
        const value = await compressPhoto(file);
        if (editor !== context || task !== context.task) return;
        context.photo = value;
        fields.photo.value = '';
        fields.photo.setCustomValidity('');
        message.textContent = 'Фото готово.';
        context.dirty = true;
      } catch (error) {
        if (editor !== context || task !== context.task) return;
        message.textContent = error.name === 'EncodingError' ? 'Не удалось открыть изображение.' : error.message;
      } finally {
        if (editor === context && task === context.task) {
          fields.upload.value = '';
          setBusy(false);
          updatePreview();
        }
      }
    });
    remove.addEventListener('click', () => {
      context.task++;
      context.dirty = true;
      context.photo = '';
      setBusy(false);
      fields.upload.value = '';
      fields.photo.value = '';
      fields.photo.setCustomValidity('');
      message.textContent = '';
      updatePreview();
    });
    form.querySelector('.kwitems-back').addEventListener('click', cancel);
    form.querySelector('.kwitems-cancel').addEventListener('click', cancel);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (context.busy) return;
      const name = fields.name.value.trim();
      fields.name.setCustomValidity(name ? '' : 'Введите название карточки.');
      const price = fields.price.value === '' ? null : fields.price.valueAsNumber;
      fields.price.setCustomValidity(price !== null && (!Number.isSafeInteger(price) || price < 1) ? 'Введите целую цену от 1 рубля.' : '');
      const source = fields.source.value.trim();
      fields.source.setCustomValidity(source && !externalUrl(source) ? 'Введите HTTPS-ссылку на публикацию.' : '');
      applyPhotoUrl();
      if (!form.reportValidity()) return;
      const result = {
        ...original,
        id: item?.id ?? (globalThis.crypto?.randomUUID?.() || 'item-' + Date.now().toString(36) + Math.random().toString(36).slice(2)),
        category: fields.category.value,
        name,
        summary: fields.summary.value.trim(),
        dimensions: fields.dimensions.value.trim(),
        price,
        photo: context.photo.replace(/^(?:\.\.\/|\.\/|\/)/, ''),
        source,
        published: fields.published.checked,
      };
      const selectedTour = fields.tourId.value;
      if (selectedTour === inheritedTour || (selectedTour === 'none' && !inheritedTour)) delete result.tourId;
      else result.tourId = selectedTour;
      closeEditor();
      commit(item ? records.map(record => record === item ? result : record) : [...records, result], 'Карточка сохранена в черновике. Чтобы показать изменения посетителям, нажмите «Опубликовать».');
      const savedRow = Array.from(list.children).find(row => row.dataset.record === result.id);
      (savedRow?.querySelector('.kwitems-edit') || add).focus({ preventScroll: true });
    });
    panel.replaceChildren(form);
    panel.hidden = false;
    browser.hidden = true;
    fields.name.focus();
  }

  function renderList() {
    const query = search.value.toLocaleLowerCase('ru').trim();
    const visible = records.filter(item => (!filter.value || item.category === filter.value)
      && (!query || [item.name, item.summary, item.dimensions, categories.get(item.category)].join(' ').toLocaleLowerCase('ru').includes(query)));
    count.textContent = `Карточек в списке — ${visible.length} из ${records.length}`;
    const fragment = document.createDocumentFragment();
    visible.forEach((item, index) => {
      const row = element('li', 'kwitems-row');
      row.dataset.record = item.id;
      const picture = element('div', 'kwitems-thumbnail');
      syncImage(picture, item.photo);
      const body = element('div', 'kwitems-row-body');
      const title = element('h4', '', item.name || 'Без названия');
      const info = element('div', 'kwitems-meta');
      const shown = item.published !== false;
      const badge = element('span', 'kwitems-badge' + (shown ? ' kwitems-visible' : ''), shown ? 'Показана' : 'Скрыта');
      info.append(element('span', '', categories.get(item.category) || 'Без раздела'), badge);
      if (item.dimensions) info.append(element('span', '', item.dimensions));
      info.append(element('span', 'kwitems-price', Number.isSafeInteger(item.price) && item.price > 0
        ? rubles.format(item.price)
        : 'Цена по запросу'));
      body.append(title, info);
      const actions = element('div', 'kwitems-row-actions');
      const addAction = (label, className, handler, accessibleName) => {
        const node = button(label, className);
        if (accessibleName) node.setAttribute('aria-label', accessibleName);
        node.addEventListener('click', handler);
        actions.append(node);
        return node;
      };
      if (pendingRemoval === item) {
        actions.classList.add('kwitems-confirm');
        actions.append(element('span', '', 'Удалить карточку?'));
        addAction('Удалить', 'kwitems-danger', () => {
          commit(records.filter(entry => entry !== item), 'Карточка удалена.');
          add.focus();
        });
        const cancel = addAction('Отмена', '', () => { pendingRemoval = undefined; renderList(); list.querySelectorAll('.kwitems-edit')[index]?.focus(); });
        requestAnimationFrame(() => cancel.focus());
      } else {
        addAction('Изменить', 'kwitems-edit', () => edit(item), `Изменить «${item.name}»`);
        addAction(shown ? 'Скрыть' : 'Показать', '', () => {
          commit(records.map(entry => entry === item ? { ...entry, published: !shown } : entry),
            shown ? 'Карточка скрыта.' : 'Карточка показана.');
          list.querySelectorAll('.kwitems-edit')[index]?.focus();
        });
        const move = (offset) => {
          const other = visible[index + offset];
          if (!other) return;
          const next = [...records];
          const a = next.indexOf(item);
          const b = next.indexOf(other);
          [next[a], next[b]] = [next[b], next[a]];
          commit(next, 'Порядок карточек изменён.');
          list.querySelectorAll('.kwitems-edit')[index + offset]?.focus();
        };
        addAction('↑', 'kwitems-arrow', () => move(-1), `Поднять «${item.name}» выше`).disabled = index === 0;
        addAction('↓', 'kwitems-arrow', () => move(1), `Опустить «${item.name}» ниже`).disabled = index === visible.length - 1;
        addAction('Удалить', 'kwitems-delete', () => { pendingRemoval = item; renderList(); }, `Удалить «${item.name}»`);
      }
      row.append(picture, body, actions);
      fragment.append(row);
    });
    if (!visible.length) fragment.append(element('li', 'kwitems-empty', records.length ? 'По этим условиям карточек нет.' : 'Добавьте первую карточку, чтобы начать каталог.'));
    list.replaceChildren(fragment);
  }

  add.addEventListener('click', () => edit());
  function changeFilter() {
    pendingRemoval = undefined;
    status.textContent = '';
    renderList();
  }
  filter.addEventListener('change', changeFilter);
  search.addEventListener('input', changeFilter);
  renderList();
  return {
    openNew() {
      if (editor) return false;
      edit();
      return true;
    },
    openItem(id) {
      const item = records.find(record => record.id === id);
      if (editor || !item) return false;
      edit(item);
      return true;
    },
    hasPendingChanges() { return Boolean(editor && (editor.dirty || editor.busy)); },
    destroy() { clearTimeout(editor?.photoTimer); editor = undefined; root.remove(); },
  };
}
