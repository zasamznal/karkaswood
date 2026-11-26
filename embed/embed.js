// Страница-вставка с объёмной моделью. Подключается на любом сайте через iframe:
//   <iframe src="https://АДРЕС-САЙТА/embed/?id=bath-terrace" width="100%" height="560" style="border:0" loading="lazy"></iframe>
// Параметры адреса:
//   id=<идентификатор карточки>  — какую модель показать (см. data/site.json), по умолчанию первую;
//   picker=0                     — скрыть список выбора постройки;
//   view=outside|inside|plan     — начальный вид;
//   season=classic|newyear       — оформление сцены.
import { mountFeaturedProject } from '../assets/featured-project.js';
import { loadPublicSite } from '../assets/site-data.js';
import { applySeason } from '../assets/season.js';
import { resolveTheme } from '../assets/site-defaults.js';

const params = new URLSearchParams(location.search);
const section = document.querySelector('#viewer');
try {
  const { settings, items } = await loadPublicSite();
  const season = params.get('season');
  applySeason(['classic', 'newyear'].includes(season) ? season : resolveTheme(settings));
  const published = items.filter(item => item?.published !== false && item?.id);
  if (params.get('picker') === '0') section.dataset.single = '';
  const viewer = mountFeaturedProject(section, published, { insideWidth: Number(settings.insideWidth) || 220, bedWidth: 140 });
  const id = params.get('id');
  if (id) viewer.selectProject(id);
  const view = params.get('view');
  if (['inside', 'plan'].includes(view)) section.querySelector(`[data-view="${view}"]`)?.click();
} catch {
  section.querySelector('.model-loading').textContent = 'Модель не загрузилась. Обновите страницу.';
}
