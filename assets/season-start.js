// Apply the last known palette before rendering. The live catalogue reconciles it on load.
(() => {
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  function savedSettings(key) {
    try { return JSON.parse(localStorage.getItem(key))?.settings; }
    catch { return null; }
  }
  // Keep in step with isHolidaySeason() in site-defaults.js: 1 December to 14 January.
  function holidays() {
    const now = new Date(), month = now.getMonth() + 1;
    return month === 12 || (month === 1 && now.getDate() <= 14);
  }
  function chosen(settings) {
    if (settings.extra && settings.extra.themeMode === 'auto') return holidays() ? 'newyear' : 'classic';
    return settings.theme;
  }
  const draft = params.get('preview') === 'draft' && savedSettings('kw:site-draft:v1');
  const explicit = params.get('season');
  let theme;
  if (draft) theme = chosen(draft);
  else if (explicit === 'classic' || explicit === 'newyear') theme = explicit;
  else {
    const published = savedSettings('kw:public-site:v2');
    // A first-time visitor has no saved copy yet, so the calendar is the best guess.
    theme = published ? chosen(published) : (holidays() ? 'newyear' : 'classic');
  }
  if (theme === 'newyear') root.dataset.kwSeason = 'newyear';
  else delete root.dataset.kwSeason;
})();
