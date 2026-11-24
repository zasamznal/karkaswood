// A prepared cover belongs to a specific workshop photograph. An owner replacement takes precedence.
const covers = new Map([
  ['barn-2-4-5', [105, 'Деревянный торец и графитовая боковая стена жилого барн-модуля']],
  ['scandinavia-3-5', [342, 'Тёмная баня «Скандинавия» с большим торцевым окном и остеклённой дверью']],
  ['barn-compact', [89, 'Входной фасад компактного хозблока BARN с распашной деревянной дверью']],
  ['workshop-3-4', [359, 'Вход и боковая стена деревянной бытовки-мастерской']],
  ['loft-woodstore', [335, 'Деревянный хозблок LOFT с открытым реечным дровником']],
  ['bath-panoramic', [382, 'Панорамная баня на снегу с остеклённым входом и большим торцевым окном']],
  ['provence-garden', [282, 'Светлый хозблок «Прованс» с кашпо под окном и деревянными дверями']],
  ['bath-terrace', [391, 'Два крыла бани с террасой вокруг открытого заснеженного настила']],
  ['loft-garden', [333, 'Хозблок LOFT с узким окном справа от графитовой двери']],
  ['barn-maxi', [323, 'Входной фасад BARN MAXI с высокой двускатной крышей и двумя окнами']]
]);

export function getProjectCover(item) {
  const entry = covers.get(item?.id);
  if (!entry) return null;
  const [post, description] = entry;
  const original = item.id === 'barn-2-4-5' ? 'assets/photos/front.webp' : 'assets/catalog-photos/' + item.id + '.webp';
  if (item.photo !== original || typeof item.source !== 'string' || item.source.replace(/\/$/, '') !== 'https://t.me/karkaswoodstroy/' + post) return null;
  const isOriginal = item.id === 'barn-compact' || item.id === 'provence-garden';
  let file = './catalog-covers/' + item.id + '.webp';
  if (item.id === 'provence-garden') file = './catalog-covers/provence-garden.jpg';
  if (item.id === 'barn-compact') file = './catalog-photos/barn-compact.webp';
  return {
    src: new URL(file, import.meta.url).href,
    alt: isOriginal ? description : 'Визуализация по фото мастерской. ' + description,
    position: item.id === 'provence-garden' ? '50% 56%' : '50% 50%',
    isOriginal
  };
}
