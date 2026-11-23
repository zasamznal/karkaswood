let removeSnow;

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
  const winter = theme === 'newyear';
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const image = hero?.querySelector('[data-classic-src]');
  if (winter) root.dataset.kwSeason = 'newyear';
  else delete root.dataset.kwSeason;
  if (image) {
    const key = winter ? 'newyear' : 'classic';
    const src = image.dataset[key + 'Src'];
    if (image.getAttribute('src') !== src) image.src = src;
    image.alt = image.dataset[key + 'Alt'];
  }
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = winter ? '#14312f' : '#f7f6ef';
  if (winter && hero && !removeSnow) removeSnow = addSnow(hero);
  if (!winter) {
    removeSnow?.();
    removeSnow = undefined;
  }
}
