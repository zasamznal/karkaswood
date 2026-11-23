const revealSelector = [
  'main section h2',
  '.section-header .eyebrow',
  '.section-header .aside-text',
  '.metrics > div',
  '.photo',
  '.specs > div',
  '[data-reveal]'
].join(',');

let disconnect;

export function mountMotion() {
  if (disconnect) return disconnect;
  const main = document.querySelector('main');
  if (!main) return () => {};

  const progress = document.createElement('div');
  progress.className = 'kw-reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);

  const preferences = window.matchMedia('(prefers-reduced-motion: reduce)');
  const played = new WeakSet();
  let frame = 0;

  function drawProgress() {
    frame = 0;
    const scroller = document.scrollingElement || document.documentElement;
    const range = scroller.scrollHeight - scroller.clientHeight;
    const fraction = range > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / range)) : 0;
    progress.style.transform = `scaleX(${fraction.toFixed(4)})`;
  }

  function queueProgress() {
    if (!document.hidden && !frame) frame = requestAnimationFrame(drawProgress);
  }

  function enter(element, className = 'kw-motion-enter') {
    if (played.has(element)) return;
    played.add(element);
    if (!preferences.matches && !document.hidden && !element.matches(':focus-within')) {
      element.classList.add(className);
    }
  }

  const observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting || document.hidden) continue;
          enter(entry.target);
          observer.unobserve(entry.target);
        }
      }, { threshold: 0.05 })
    : null;

  function watch(scope) {
    if (!observer) return;
    if (scope.matches(revealSelector) && !played.has(scope)) observer.observe(scope);
    for (const element of scope.querySelectorAll(revealSelector)) {
      if (!played.has(element)) observer.observe(element);
    }
  }

  function revealIntro() {
    if (document.hidden) return;
    for (const element of main.querySelectorAll('h1, .hero-place, .hero-intro, .hero-actions')) {
      const bounds = element.getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < window.innerHeight) enter(element, 'kw-motion-intro');
    }
  }

  function onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    revealIntro();
    observer?.disconnect();
    watch(main);
    queueProgress();
  }

  function onAnimationEnd(event) {
    if (event.animationName === 'kw-section-arrive') event.target.classList.remove('kw-motion-enter');
    if (event.animationName === 'kw-intro-arrive') event.target.classList.remove('kw-motion-intro');
  }

  // A catalog can replace its DOM after a filter change. Its controls stay untouched.
  const additions = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement) watch(node);
      }
    }
  });
  additions.observe(main, { childList: true, subtree: true });
  const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(queueProgress) : null;
  sizes?.observe(document.body);

  window.addEventListener('scroll', queueProgress, { passive: true });
  window.addEventListener('resize', queueProgress, { passive: true });
  window.addEventListener('pageshow', queueProgress);
  document.addEventListener('visibilitychange', onVisibility);
  main.addEventListener('animationend', onAnimationEnd);
  main.addEventListener('animationcancel', onAnimationEnd);
  revealIntro();
  watch(main);
  queueProgress();

  disconnect = () => {
    observer?.disconnect();
    additions.disconnect();
    sizes?.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', queueProgress);
    window.removeEventListener('resize', queueProgress);
    window.removeEventListener('pageshow', queueProgress);
    document.removeEventListener('visibilitychange', onVisibility);
    main.removeEventListener('animationend', onAnimationEnd);
    main.removeEventListener('animationcancel', onAnimationEnd);
    main.querySelectorAll('.kw-motion-intro, .kw-motion-enter').forEach(element =>
      element.classList.remove('kw-motion-intro', 'kw-motion-enter'));
    progress.remove();
    disconnect = undefined;
  };
  return disconnect;
}
