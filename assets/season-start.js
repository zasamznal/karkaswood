// Apply the last known palette before rendering. The live catalogue reconciles it on load.
(() => {
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  function savedSettings(key) {
    try { return JSON.parse(localStorage.getItem(key))?.settings; }
    catch { return null; }
  }
  const draft = params.get('preview') === 'draft' && savedSettings('kw:site-draft:v1');
  const explicit = params.get('season');
  let theme = root.dataset.kwSeason;
  if (draft) theme = draft.theme;
  else if (explicit === 'classic' || explicit === 'newyear') theme = explicit;
  else {
    const published = savedSettings('kw:public-site:v2');
    if (published) theme = published.theme;
  }
  if (theme === 'newyear') root.dataset.kwSeason = 'newyear';
  else delete root.dataset.kwSeason;
})();
