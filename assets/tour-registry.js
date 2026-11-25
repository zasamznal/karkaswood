export const tourTemplates = Object.freeze({
  "barn-2-4-5": "Жилой барн-модуль",
  "scandinavia-3-5": "Баня «Скандинавия»",
  "barn-compact": "Хозблок «Барн»",
  "workshop-3-4": "Бытовка-мастерская",
  "loft-woodstore": "Хозблок «Лофт» с дровником",
  "bath-panoramic": "Баня с панорамными окнами",
  "provence-garden": "Хозблок «Прованс»",
  "bath-terrace": "Баня с террасой",
  "loft-garden": "Дачный хозблок «Лофт»",
  "barn-maxi": "Хозблок «Барн Макси»"
});

export function getTourId(item) {
  const key = item?.tourId ?? item?.id;
  return Object.hasOwn(tourTemplates, key) ? key : null;
}
