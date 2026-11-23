const revealSelector = [
  'main section h2', '.section-header .eyebrow', '.section-header .aside-text',
  '.metrics > div', '.photo', '.specs > div', '[data-reveal]', '.kc-card', '.kc-empty'
].join(',');

let disconnect;

export function mountMotion() {
  if (disconnect) return disconnect;
  const main = document.querySelector('main');
  if (!main) return () => {};
  const root = document.documentElement;
  const hero = main.querySelector('.hero');
  const mast = document.querySelector('.mast');
  const catalog = main.querySelector('#product-catalog');
  const lightboxImage = document.querySelector('.lightbox .lb-image');
  const links = [...document.querySelectorAll('.mast-nav a[href^="#"]')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const wide = matchMedia('(min-width: 721px)');
  const events = new AbortController();
  const passive = {passive: true, signal: events.signal};
  const progress = document.createElement('div');
  progress.className = 'kw-reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
  root.classList.add('kw-motion-on');

  let frame = 0, needsMeasure = true, activeLink;
  let scrollRange = 0, headHeight = 0, heroTop = 0, heroHeight = 0;
  let navRanges = [], litVisual, pointerFrame = 0, pointerX, pointerY, photoAnimation;
  const played = new WeakSet();

  function draw() {
    frame = 0;
    const scroller = document.scrollingElement || root;
    const y = scroller.scrollTop;
    if (needsMeasure) {
      needsMeasure = false;
      headHeight = mast?.offsetHeight || 0;
      if (hero) {
        const rect = hero.getBoundingClientRect();
        heroTop = y + rect.top;
        heroHeight = rect.height;
      }
      scrollRange = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      navRanges = sections.map(section => {
        if (!section) return null;
        const {top, bottom, height} = section.getBoundingClientRect();
        return height > 0 ? [y + top, y + bottom] : null;
      });
      root.style.setProperty('--kw-head-height', headHeight + 'px');
    }
    const fraction = scrollRange ? Math.min(1, Math.max(0, y / scrollRange)) : 0;
    progress.style.transform = 'scaleX(' + fraction.toFixed(4) + ')';

    const line = y + (wide.matches ? headHeight : 0) + Math.min(145, scroller.clientHeight * .22);
    let index = navRanges.findIndex(range => range && line >= range[0] && line < range[1]);
    if (index < 0 && scrollRange && y >= scrollRange - 2) index = navRanges.findLastIndex(range => range);
    const link = links[index];
    if (link !== activeLink) {
      activeLink?.removeAttribute('aria-current');
      link?.setAttribute('aria-current','location');
      activeLink = link;
    }

    // Only the visible desktop hero moves. Height and section bounds are cached between resizes.
    if (heroHeight && wide.matches && !reduced.matches && y < heroTop + heroHeight && y + scroller.clientHeight > heroTop) {
      const offset = Math.min(1, Math.max(0, (y - heroTop) / heroHeight));
      hero.style.setProperty('--kw-landscape-shift', (offset * 14).toFixed(2) + 'px');
    }
  }
  function queueDraw() {
    if (!document.hidden && !frame) frame = requestAnimationFrame(draw);
  }
  function measure() { needsMeasure = true; queueDraw(); }

  function enter(element, className = 'kw-motion-enter') {
    if (played.has(element)) return;
    played.add(element);
    if (!reduced.matches && !document.hidden && !element.matches(':focus-within')) element.classList.add(className);
  }
  const observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting || document.hidden) continue;
          const element = entry.target;
          enter(element, element.matches('.kc-card,.kc-empty') ? 'kw-card-enter' : 'kw-motion-enter');
          observer.unobserve(element);
        }
      }, {threshold: .04})
    : null;
  function watch(scope) {
    if (!observer) return;
    if (scope.matches(revealSelector) && !played.has(scope)) observer.observe(scope);
    for (const element of scope.querySelectorAll(revealSelector)) {
      if (!played.has(element)) observer.observe(element);
    }
  }
  function intro() {
    if (document.hidden) return;
    for (const element of main.querySelectorAll('.hero h1,.hero-place,.hero-intro,.hero-actions')) {
      if (played.has(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < innerHeight) enter(element,'kw-motion-intro');
    }
  }

  function clearLight() {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    litVisual?.classList.remove('kw-card-lit');
    litVisual = null;
  }
  function moveLight(event) {
    if (document.hidden || reduced.matches || !finePointer.matches || event.pointerType === 'touch') return;
    const visual = event.target.closest('.kc-card-open')?.querySelector('.kc-visual');
    if (visual !== litVisual) {
      clearLight();
      litVisual = visual;
    }
    if (!visual) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      const rect = visual.getBoundingClientRect();
      visual.style.setProperty('--kw-light-x', Math.min(rect.width, Math.max(0,pointerX - rect.left)) + 'px');
      visual.style.setProperty('--kw-light-y', Math.min(rect.height, Math.max(0,pointerY - rect.top)) + 'px');
      visual.classList.add('kw-card-lit');
    });
  }

  function newPhoto() {
    photoAnimation?.cancel();
    if (document.hidden || reduced.matches || !lightboxImage?.closest('dialog[open]') || !lightboxImage.animate) return;
    photoAnimation = lightboxImage.animate([
      {opacity: .73, transform: 'scale(.988)'},
      {opacity: 1, transform: 'scale(1)'}
    ], {duration: 265, easing: 'cubic-bezier(.22,.75,.2,1)'});
  }
  function settingsChanged() {
    clearLight();
    if (reduced.matches) photoAnimation?.cancel();
    measure();
  }
  function visibilityChanged() {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      clearLight();
      photoAnimation?.cancel();
    } else {
      intro();
      observer?.disconnect();
      watch(main);
      measure();
    }
  }

  const completed = {
    'kw-section-arrive': 'kw-motion-enter',
    'kw-intro-arrive': 'kw-motion-intro',
    'kw-title-arrive': 'kw-motion-intro',
    'kw-project-arrive': 'kw-card-enter'
  };
  function finish(event) {
    const name = completed[event.animationName];
    if (name) event.target.classList.remove(name);
  }
  const additions = new MutationObserver(records => {
    for (const record of records) {
      // Expanding or collapsing the catalog recreates its cards, including the existing first row.
      // Cards that keep their position should stay still.
      if (record.target.matches?.('.kc-grid')) {
        const before = [...record.removedNodes];
        [...record.addedNodes].forEach((card, i) => {
          const itemLabel = card.querySelector?.('.kc-card-open')?.getAttribute('aria-label');
          if (itemLabel && before[i]?.querySelector?.('.kc-card-open')?.getAttribute('aria-label') === itemLabel) played.add(card);
        });
      }
      for (const node of record.addedNodes) if (node instanceof HTMLElement) watch(node);
    }
    if (records.some(record => record.target === catalog || record.target.matches?.('.kc-grid'))) {
      clearLight();
      measure();
    }
  });
  additions.observe(main,{childList: true,subtree: true});
  const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
  for (const element of [document.body,mast,hero,...sections]) if (element) sizes?.observe(element);
  catalog?.addEventListener('pointermove',moveLight,passive);
  catalog?.addEventListener('pointerleave',clearLight,passive);
  lightboxImage?.addEventListener('load',newPhoto,passive);
  for (const query of [reduced,finePointer,wide]) query.addEventListener('change',settingsChanged,passive);
  window.addEventListener('scroll',queueDraw,passive);
  window.addEventListener('resize',measure,passive);
  window.addEventListener('pageshow',measure,passive);
  document.addEventListener('visibilitychange',visibilityChanged,passive);
  main.addEventListener('animationend',finish,passive);
  main.addEventListener('animationcancel',finish,passive);
  intro();
  watch(main);
  measure();

  disconnect = () => {
    events.abort();
    observer?.disconnect();
    additions.disconnect();
    sizes?.disconnect();
    cancelAnimationFrame(frame);
    clearLight();
    photoAnimation?.cancel();
    activeLink?.removeAttribute('aria-current');
    main.querySelectorAll('.kw-motion-intro,.kw-motion-enter,.kw-card-enter').forEach(el =>
      el.classList.remove('kw-motion-intro','kw-motion-enter','kw-card-enter'));
    root.classList.remove('kw-motion-on');
    root.style.removeProperty('--kw-head-height');
    hero?.style.removeProperty('--kw-landscape-shift');
    progress.remove();
    disconnect = undefined;
  };
  return disconnect;
}
