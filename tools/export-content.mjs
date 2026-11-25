// Собирает всё содержимое сайта в один читаемый файл docs/CONTENT.md.
// Нужен для переноса на конструктор (Tilda и подобные) и для сверки текстов.
// Запуск из корня репозитория: node tools/export-content.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { normalizeSite, BADGES } from '../assets/site-defaults.js';
import { getOffer } from '../assets/project-offers.js';
import { getProjectPhotos } from '../assets/workshop-photos.js';
import { tourTemplates } from '../assets/tour-registry.js';
import { projectDefinitions } from '../assets/project-definitions.js';

const seed = JSON.parse(readFileSync(new URL('../data/site.json', import.meta.url), 'utf8'));
const { settings, items } = normalizeSite(seed);
const extra = settings.extra;
const rub = new Intl.NumberFormat('ru-RU');
const categories = { utility: 'Хозблоки', bath: 'Бани', cabin: 'Бытовки', house: 'Дома' };
const out = [];
const line = (text = '') => out.push(text);

line('# Содержимое сайта «Каркасвуд»');
line();
line('Файл собран автоматически командой `node tools/export-content.mjs` из `data/site.json` и `assets/site-defaults.js`.');
line('Здесь стартовые тексты и каталог. Опубликованная версия может отличаться, если владелец менял её в панели.');
line();
line('## Основное');
line();
line('| Поле | Значение |');
line('| --- | --- |');
for (const [label, value] of [
  ['Название по-русски', extra.brandRu], ['Название латиницей', settings.brand], ['Заголовок первого экрана', settings.heading],
  ['Текст под заголовком', settings.intro], ['Расположение', settings.location], ['Телефон', settings.phone],
  ['Telegram для заявок', settings.telegram], ['Telegram-канал', settings.channel], ['Контактное лицо', extra.contactName],
  ['Оформление в стартовом каталоге', settings.theme === 'newyear' ? 'новогоднее' : 'обычное'],
]) line(`| ${label} | ${String(value || '—').replace(/\|/g, '\\|')} |`);
line();
line('## О мастерской');
line();
line(extra.about);
line();
for (const fact of extra.facts) line(`- **${fact.title}.** ${fact.text}`);
line();
line('## Как заказать');
line();
extra.steps.forEach((step, index) => line(`${index + 1}. **${step.title}.** ${step.text}`));
line();
line('## Из чего строят');
line();
line('| Что | Из чего и как |');
line('| --- | --- |');
for (const row of extra.materials) line(`| ${row.title} | ${row.text} |`);
line();
line('## Частые вопросы');
line();
for (const entry of extra.faq) { line(`**${entry.q}**`); line(); line(entry.a); line(); }
line('## Каталог');
line();
for (const item of items) {
  const offer = getOffer(item);
  line(`### ${item.name}`);
  line();
  line(`- Идентификатор: \`${item.id}\``);
  line(`- Раздел: ${categories[item.category] || item.category}`);
  line(`- Габариты: ${item.dimensions || '—'}`);
  if (offer.currentPrice) line(`- Актуальная цена: ${rub.format(offer.currentPrice)} ₽`);
  if (offer.reference) line(`- Цена в публикации от ${offer.reference.date.split('-').reverse().join('.')}: ${rub.format(offer.reference.price)} ₽. ${offer.reference.description}`);
  if (item.badge) line(`- Отметка: ${BADGES[item.badge]}`);
  line(`- Обложка: \`${item.photo}\``);
  const album = getProjectPhotos(item).map(photo => '`' + photo.src + '`');
  if (album.length) line(`- Другие фотографии: ${album.join(', ')}`);
  line(`- Публикация мастерской: ${item.source || '—'}`);
  const tour = item.tourId ?? item.id;
  if (Object.hasOwn(tourTemplates, tour)) line(`- Объёмная модель: \`embed/?id=${item.id}\`${projectDefinitions[tour]?.note ? ' — ' + projectDefinitions[tour].note : ''}`);
  line();
  line(item.summary);
  line();
  if (offer.included.length) { line('В показанном проекте:'); line(); for (const row of offer.included) line(`- ${row}`); line(); }
  if (offer.clarify.length) { line('Уточнить при заказе: ' + offer.clarify.join(' ')); line(); }
}
writeFileSync(new URL('../docs/CONTENT.md', import.meta.url), out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
console.log('docs/CONTENT.md: ' + out.length + ' строк');
