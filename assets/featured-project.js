import { getTourId } from './tour-registry.js';
import { openProjectTour } from './project-dialog.js';

const BARN = 'barn-2-4-5';
const instances = new WeakMap();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function icon(id) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'), use = document.createElementNS(ns, 'use');
  svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', '#i-' + id); svg.append(use);
  return svg;
}

export function mountFeaturedProject(section, items, options = {}) {
  instances.get(section)?.dispose();
  const published = items.filter(item => item?.published !== false && item?.visible !== false && typeof item?.id === 'string' && getTourId(item));
  const heading = section.querySelector('#viewer-title'), intro = section.querySelector('.section-header .aside-text');
  const metrics = section.querySelector('.barn-metrics'), card = section.querySelector('.viewer-card');
  const model = card.querySelector('#model'), tabs = [...card.querySelectorAll('[data-view]')];
  const orbit = card.querySelector('[data-auto]'), turns = [...card.querySelectorAll('[data-turn]')], reset = card.querySelector('[data-reset]');
  const picker = section.querySelector('#tour-picker'), row = picker.closest('.tour-picker-row'), label = row.querySelector('label');
  const previous = { title: heading.textContent, intro: intro.textContent, label: label.textContent, rowNext: row.nextSibling,
    hidden: section.hidden, options: [...picker.children], modelChildren: [...model.childNodes] };
  const facts = element('div', 'fp-facts'), measure = element('div', 'fp-measure'), numbers = element('strong', 'fp-dimensions');
  numbers.dataset.featuredDimensions = '';
  const measureText = element('div', 'fp-measure-text'), summary = element('p', 'fp-summary');
  measureText.append(element('span', 'fp-caption', 'Габариты'), numbers);
  measure.append(icon('ruler'), measureText); facts.append(measure, summary);
  const expand = element('button', 'fp-expand');
  expand.type = 'button'; expand.dataset.featuredExpand = ''; expand.append(icon('expand'), document.createTextNode('Развернуть обзор'));
  const status = element('div', 'model-loading fp-status'), statusText = element('span');
  const retry = element('button', 'fp-retry', 'Повторить');
  retry.type = 'button'; status.setAttribute('role', 'status'); status.append(statusText, retry);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController(), listen = (node, event, cb) => node.addEventListener(event, cb, { signal: controller.signal });
  let active = null, current = null, surface = null, cachedBarn = null, category = 'all', disposed = false;
  let nearViewport = false, loadPromise = null, version = 0, view = 'outside', rotating = false;
  let bedWidth = options.bedWidth || 140, insideWidth = options.insideWidth || 220;

  section.classList.add('fp-ready');
  label.textContent = 'Проект для осмотра'; row.hidden = false; row.append(expand);
  metrics.before(row, facts);
  intro.textContent = 'Поверните постройку, откройте разрез или посмотрите на план сверху.';

  function syncControls() {
    tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.view === view)));
    orbit.disabled = !active || view === 'plan' || motion.matches;
    orbit.setAttribute('aria-pressed', String(rotating));
    const label = rotating ? 'Остановить вращение' : 'Включить автоматическое вращение';
    orbit.setAttribute('aria-label', label); orbit.title = label;
  }

  function notify(item) { options.onFeatureChanged?.(item); }

  function clearRenderer() {
    ++version; loadPromise = null; rotating = false;
    if (current && cachedBarn?.viewer === current) current.setAutoRotate(false);
    else current?.dispose();
    current = null; surface?.remove(); surface = null; model.replaceChildren();
  }

  function showStatus(message, failed = false) {
    statusText.textContent = message; retry.hidden = !failed;
    if (status.parentNode !== model) model.append(status);
  }

  async function load() {
    if (disposed || !active) return null;
    if (current) return current;
    if (loadPromise) return loadPromise;
    const id = getTourId(active), token = version, host = surface;
    showStatus('Загружаем модель…');
    const valid = () => !disposed && token === version && host === surface;
    let job;
    job = (async () => {
      try {
        let renderer;
        if (id === BARN) {
          const { mountViewer } = await import('./viewer.js');
          if (!valid()) return null;
          renderer = mountViewer(host);
          renderer.setInsideWidth(insideWidth); renderer.setBedWidth(bedWidth);
          cachedBarn = { host, viewer: renderer };
        } else {
          const [{ projectDefinitions }, { mountProjectViewer }] = await Promise.all([
            import('./project-definitions.js'), import('./project-viewer.js'),
          ]);
          if (!valid()) return null;
          if (!Object.hasOwn(projectDefinitions, id)) throw new Error('Missing project model');
          renderer = mountProjectViewer(host, projectDefinitions[id]);
        }
        current = renderer; current.setView(view); status.remove();
        return current;
      } catch {
        if (valid()) { host.replaceChildren(); showStatus('Модель не загрузилась.', true); }
        return null;
      } finally {
        if (valid() && job === loadPromise) loadPromise = null;
      }
    })();
    loadPromise = job;
    return job;
  }

  function activate(item) {
    if (disposed) return false;
    if (active?.id === item?.id && section.hasAttribute('data-featured-project')) return Boolean(active);
    clearRenderer();
    active = item || null; section.hidden = !active;
    if (!active) {
      delete section.dataset.featuredProject;
      notify(null); return false;
    }
    const barn = getTourId(active) === BARN;
    section.dataset.featuredProject = active.id;
    heading.textContent = 'Модель: ' + (active.name || 'проект мастерской');
    picker.value = active.id; metrics.hidden = !barn; expand.hidden = barn;
    const dimensions = typeof active.dimensions === 'string' ? active.dimensions.trim() : '';
    const description = typeof active.summary === 'string' ? active.summary.trim() : '';
    facts.hidden = barn || (!dimensions && !description);
    measure.hidden = !dimensions; numbers.textContent = dimensions;
    summary.hidden = !description; summary.textContent = description;
    view = 'outside'; syncControls();
    if (barn && cachedBarn) {
      surface = cachedBarn.host; current = cachedBarn.viewer;
      model.append(surface);
      current.setInsideWidth(insideWidth); current.setBedWidth(bedWidth); current.resize(); current.setView(view);
    } else {
      surface = element('div', 'fp-surface'); model.append(surface);
      showStatus('Загружаем модель…');
      if (nearViewport) void load();
    }
    notify(active);
    return true;
  }

  function eligible() { return category === 'all' ? published : published.filter(item => item.category === category); }
  function updatePicker(list) {
    picker.replaceChildren(...list.map(item => new Option(item.name || 'Проект мастерской', item.id)));
    picker.disabled = list.length < 2;
  }
  function chooseCategory(nextCategory = 'all') {
    if (disposed) return false;
    category = nextCategory || 'all';
    const list = eligible(); updatePicker(list);
    const candidate = category === 'all' ? list.find(item => getTourId(item) === BARN) : list.find(item => item.id === active?.id);
    const chosen = candidate || list[0];
    if (chosen) picker.value = chosen.id;
    return activate(chosen);
  }
  function selectProject(id) {
    const chosen = published.find(item => item.id === id);
    if (!chosen || disposed) return false;
    if (category !== 'all' && chosen.category !== category) { category = 'all'; updatePicker(published); }
    return activate(chosen);
  }
  function changeView(next) {
    view = next; rotating = false; syncControls();
    if (current) current.setView(view); else void load();
  }
  function operate(action) {
    const token = version;
    if (current) { action(current); return; }
    void load().then(renderer => { if (renderer && token === version && !disposed) action(renderer); });
  }

  listen(picker, 'change', () => selectProject(picker.value));
  listen(expand, 'click', () => {
    if (!active) return;
    current?.setAutoRotate(false);
    openProjectTour(active, expand, options.onContact);
  });
  listen(retry, 'click', () => { void load(); });
  tabs.forEach(tab => listen(tab, 'click', () => changeView(tab.dataset.view)));
  turns.forEach(button => listen(button, 'click', () => operate(renderer => renderer.rotate(Number(button.dataset.turn) * 0.35))));
  listen(reset, 'click', () => operate(renderer => renderer.reset()));
  listen(orbit, 'click', () => operate(renderer => { rotating = renderer.setAutoRotate(!rotating); syncControls(); }));
  const autoChange = event => { rotating = Boolean(event.detail?.active); syncControls(); };
  listen(model, 'viewer:autorotate', autoChange); listen(model, 'viewer-autochange', autoChange);
  listen(motion, 'change', syncControls);
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => {
    nearViewport = entry.isIntersecting;
    if (nearViewport) void load();
  }, { rootMargin: '260px' }) : null;
  if (observer) observer.observe(model); else nearViewport = true;

  const api = {
    chooseCategory, selectProject,
    setBedWidth(cm) {
      if (![90, 140, 160].includes(Number(cm))) return;
      bedWidth = Number(cm); cachedBarn?.viewer.setBedWidth(bedWidth);
    },
    setInsideWidth(cm) {
      const value = Number(cm);
      if (!Number.isFinite(value) || value < 185 || value > 240) return;
      insideWidth = value; cachedBarn?.viewer.setInsideWidth(insideWidth);
    },
    dispose() {
      if (disposed) return;
      disposed = true; controller.abort(); observer?.disconnect(); clearRenderer(); cachedBarn?.viewer.dispose(); cachedBarn = null;
      heading.textContent = previous.title; intro.textContent = previous.intro; label.textContent = previous.label;
      facts.remove(); expand.remove(); section.insertBefore(row, previous.rowNext); picker.replaceChildren(...previous.options); picker.disabled = false;
      section.classList.remove('fp-ready'); delete section.dataset.featuredProject; section.hidden = previous.hidden; metrics.hidden = false;
      model.replaceChildren(...previous.modelChildren); instances.delete(section);
    },
  };
  instances.set(section, api); chooseCategory('all');
  return api;
}
