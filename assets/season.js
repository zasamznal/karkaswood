const winterImage = new URL('./winter-hero.webp', import.meta.url).href;
const winterAlt = 'Зимняя визуализация барн-модуля на заснеженном участке в Косулине';
let revertWinter;

function restoreAttribute(element, name, value) {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

function useWinterImage(image) {
  const src = image.getAttribute('src');
  const srcset = image.getAttribute('srcset');
  const alt = image.getAttribute('alt');
  const photo = new Image();
  let applied = false;

  // The summer image stays in place on a slow connection or if the winter image is unavailable.
  photo.onload = () => {
    image.removeAttribute('srcset');
    image.src = winterImage;
    image.alt = winterAlt;
    applied = true;
  };
  photo.src = winterImage;

  return () => {
    photo.onload = null;
    if (!applied) return;
    restoreAttribute(image, 'srcset', srcset);
    restoreAttribute(image, 'src', src);
    restoreAttribute(image, 'alt', alt);
  };
}

function addSnow(hero) {
  const snow = document.createElement('div');
  snow.className = 'kw-winter-snow';
  snow.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 24; index++) {
    const flake = document.createElement('i');
    flake.style.setProperty('--x', (index * 37 + 2) % 99 + '%');
    flake.style.setProperty('--y', (index * 17 + 4) % 79 + '%');
    flake.style.setProperty('--size', (index % 4 === 0 ? 3 : 2) + 'px');
    flake.style.setProperty('--sway', (index % 3 === 0 ? 18 : 8) + 'px');
    flake.style.setProperty('--start', -(index % 6) * 0.23 + 's');
    snow.append(flake);
  }
  hero.append(snow);

  let inView = false;
  function update() {
    snow.toggleAttribute('data-playing', inView && !document.hidden);
  }
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    update();
  }) : null;
  if (observer) observer.observe(hero);
  else { inView = true; update(); }
  document.addEventListener('visibilitychange', update);
  return () => {
    document.removeEventListener('visibilitychange', update);
    observer?.disconnect();
    snow.remove();
  };
}

export function applySeason(theme) {
  if (theme !== 'newyear') {
    revertWinter?.();
    revertWinter = undefined;
    return;
  }
  if (revertWinter) return;
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const image = hero?.querySelector('.hero-image');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const oldColor = themeColor?.getAttribute('content');
  root.dataset.kwSeason = 'newyear';
  if (themeColor) themeColor.content = '#14312f';

  const restoreImage = image ? useWinterImage(image) : null;
  const removeSnow = hero ? addSnow(hero) : null;
  revertWinter = () => {
    removeSnow?.();
    restoreImage?.();
    if (themeColor) restoreAttribute(themeColor, 'content', oldColor);
    delete root.dataset.kwSeason;
  };
}
