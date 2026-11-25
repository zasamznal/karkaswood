const albums = {
  'barn-2-4-5': {
    source: 'https://t.me/karkaswoodstroy/105',
    photos: [
      {src: 'assets/photos/exterior.webp',
       alt: 'Боковой фасад жилого модуля с облицовкой из графитового профлиста'},
      {src: 'assets/photos/interior.webp',
       alt: 'Помещение с обшивкой из ОСБ и окном в дальнем торце'},
      {src: 'assets/photos/night.webp',
       alt: 'Два фасадных светильника над деревянной обшивкой вечером'},
    ],
  },
  'scandinavia-3-5': {
    source: 'https://t.me/karkaswoodstroy/342',
    photos: [
      {src: 'assets/project-photos/scandinavia-3-5-entrance.webp',
       alt: 'Графитовый фасад бани с белой стеклянной дверью и дымоходом над крышей'},
      {src: 'assets/project-photos/scandinavia-3-5-lounge.webp',
       alt: 'Большое окно и настенный водонагреватель в комнате отдыха'},
      {src: 'assets/project-photos/scandinavia-3-5-sauna.webp',
       alt: 'Деревянный полок рядом с печью и дымоходом'},
    ],
  },
  'barn-compact': {
    source: 'https://t.me/karkaswoodstroy/89',
    photos: [
      {src: 'assets/project-photos/barn-compact-corner.webp',
       alt: 'Светлый деревянный торец и боковая стена из графитового профлиста'},
      {src: 'assets/project-photos/barn-compact-back.webp',
       alt: 'Задний торец хозблока, обшитый графитовым профлистом'},
    ],
  },
  'workshop-3-4': {
    source: 'https://t.me/karkaswoodstroy/359',
    photos: [
      {src: 'assets/project-photos/workshop-3-4-gable.webp',
       alt: 'Бытовка со стороны глухого торца и деревянной входной двери'},
      {src: 'assets/project-photos/workshop-3-4-entrance.webp',
       alt: 'Деревянная дверь слева и квадратное окно справа на длинном фасаде'},
      {src: 'assets/project-photos/workshop-3-4-interior.webp',
       alt: 'Дощатый пол и обшитые вагонкой стены мастерской с окном'},
    ],
  },
  'loft-woodstore': {
    source: 'https://t.me/karkaswoodstroy/335',
    photos: [
      {src: 'assets/project-photos/loft-woodstore-woodstore.webp',
       alt: 'Реечный торец дровника и дверь в закрытое отделение'},
      {src: 'assets/project-photos/loft-woodstore-rear.webp',
       alt: 'Задняя и боковая стены с тёмной металлической обшивкой'},
    ],
  },
  'bath-panoramic': {
    source: 'https://t.me/karkaswoodstroy/382',
    photos: [
      {src: 'assets/project-photos/bath-panoramic-side.webp',
       alt: 'Длинный деревянный фасад и торец бани с небольшим окном'},
      {src: 'assets/project-photos/bath-panoramic-sauna.webp',
       alt: 'Полки в два яруса и небольшое окно в стене парной'},
      {src: 'assets/project-photos/bath-panoramic-stove.webp',
       alt: 'Банная печь с дымоходом и проход в соседнее помещение'},
    ],
  },
  'provence-garden': {
    source: 'https://t.me/karkaswoodstroy/282',
    photos: [
      {src: 'assets/project-photos/provence-garden-gable.webp',
       alt: 'Торец с узким окном и белой окантовкой под скатами крыши'},
      {src: 'assets/project-photos/provence-garden-interior.webp',
       alt: 'Дощатый пол, стены из ОСБ и окно в торце хозблока'},
    ],
  },
  'bath-terrace': {
    source: 'https://t.me/karkaswoodstroy/391',
    photos: [
      {src: 'assets/project-photos/bath-terrace-deck.webp',
       alt: 'Терраса между входами в баню и хозблок, по краям видны реечные перегородки'},
      {src: 'assets/project-photos/bath-terrace-sauna.webp',
       alt: 'Деревянный полок и печь с металлическим дымоходом'},
      {src: 'assets/project-photos/bath-terrace-storage.webp',
       alt: 'Полки для хранения и деревянный каркас внутри хозблока'},
    ],
  },
  'loft-garden': {
    source: 'https://t.me/karkaswoodstroy/333',
    photos: [
      {src: 'assets/project-photos/loft-garden-side.webp',
       alt: 'Хозблок среди берёз, вид на деревянный фасад и металлическую боковую стену'},
    ],
  },
  'barn-maxi': {
    source: 'https://t.me/karkaswoodstroy/323',
    photos: [
      {src: 'assets/project-photos/barn-maxi-gable.webp',
       alt: 'Деревянный фронтон с двумя окнами и графитовая боковая стена'},
      {src: 'assets/project-photos/barn-maxi-interior.webp',
       alt: 'Деревянная обшивка, дощатый пол и открытая створка двери изнутри'},
    ],
  },
};

function workshopAlbum(item) {
  if (typeof item.id !== 'string' || typeof item.source !== 'string' || !Object.hasOwn(albums, item.id)) return [];
  const album = albums[item.id];
  if (item.source.trim().replace(/\/$/, '') !== album.source) return [];
  return album.photos.filter(photo => photo.src !== item.photo).map(({src, alt}) => ({src, alt}));
}

// Фотографии из публикации мастерской и снимки, которые владелец добавил в панели.
export function getProjectPhotos(item) {
  if (!item) return [];
  const added = (Array.isArray(item.gallery) ? item.gallery : []).filter(src => typeof src === 'string' && src && src !== item.photo)
    .map((src, index) => ({src, alt: (item.name || 'Постройка') + ' — фото ' + (index + 2)}));
  return [...workshopAlbum(item), ...added];
}
