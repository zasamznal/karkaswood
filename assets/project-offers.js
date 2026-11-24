// The price and scope below belong to the particular build in the workshop's dated post.
// The owner manages today's price and conditions independently in the catalogue.
const projects = new Map([
  ['barn-2-4-5', {
    post: 105, category: 'cabin', size: '2,4 × 5', date: '2023-09-13', price: 250000,
    included: ['Утепление пола, стен и потолка минеральной ватой 100 мм', 'Внутренняя обшивка ОСБ и электрика', 'Огнебиозащита каркаса и ламинация окна и двери'],
    separateDelivery: true
  }],
  ['workshop-3-4', {
    post: 359, category: 'cabin', size: '3 × 4', date: '2025-11-08', price: 370000,
    included: ['Утепление 100 мм и утеплённая входная дверь', 'Окно ПВХ 0,8 × 0,8 м', 'Стены и потолок из вагонки, шпунтованный пол'],
    separateDelivery: true
  }],
  ['scandinavia-3-5', {
    post: 342, category: 'bath', size: '3 × 5', date: '2025-11-05', price: 650000,
    included: ['Парная, мойка и комната отдыха', 'Утепление 100 мм и электрика', 'Душевая система и водонагреватель'],
    question: 'Уточните выбор печи, стоимость доставки и монтажа.'
  }],
  ['bath-panoramic', {
    post: 382, category: 'bath', size: '2,5 × 8', date: '2026-03-05', price: 960000,
    included: ['Три панорамных окна, парная и комната отдыха', 'Печь, душевая и водонагреватель', 'Обливное устройство'],
    question: 'Уточните доставку, монтаж и подключение воды и электрики.'
  }],
  ['bath-terrace', {
    post: 391, category: 'bath', size: '6,4 × 7', date: '2026-03-06', price: 670000,
    included: ['Баня 2,4 × 5 м с печью', 'Хозблок 2 × 4 м со стеллажами и электрикой', 'Открытая терраса 5 × 4 м с настилом из лиственницы'],
    question: 'Уточните доставку и сборку комплекса на участке.'
  }],
  ['barn-compact', {
    post: 89, category: 'utility', size: '2,4 × 3', date: '2023-08-27', price: 80000,
    included: ['Распашная дверь шириной 1,1 м', 'Дощатый пол', 'Наружная отделка графитовым профлистом'],
    question: 'Уточните стоимость доставки и установки на участке.'
  }],
  ['provence-garden', {
    post: 282, category: 'utility', size: '2,4 × 4,8', date: '2025-04-12', price: 225000,
    included: ['Два окна ПВХ с цветочными ящиками', 'Внутренняя обшивка ОСБ и дощатый пол', 'Электрика'],
    separateDelivery: true
  }],
  ['barn-maxi', {
    post: 323, category: 'utility', size: '2,4 × 5', date: '2025-07-08', price: 255000,
    included: ['Высота в коньке 3,5 м, два деревянных окна', 'Вагонка и шпунтованный пол', 'Электрика'],
    separateDelivery: true
  }],
  ['loft-garden', {
    post: 333, category: 'utility', size: '2 × 4', date: '2025-11-03', price: 125000,
    included: ['Окно ПВХ и дверь шириной 0,8 м', 'Два фасадных светильника', 'Внутренний свет и розетка'],
    separateDelivery: true
  }],
  ['loft-woodstore', {
    post: 335, category: 'utility', size: '2,2 × 7', date: '2025-11-04', price: 209000,
    included: ['Закрытое отделение для инвентаря и открытый дровник', 'Двухцветная отделка фасада', 'Кровля из профлиста'],
    separateDelivery: true
  }]
]);

function normalizeSize(value) {
  return String(value ?? '').toLowerCase().replace(/[мm\s]/g, '').replace(/[xх*]/g, '×').replace(/\./g, ',');
}

export function getOffer(item) {
  const currentPrice = Number.isFinite(item?.price) && item.price > 0 ? item.price : null;
  const currentNote = typeof item?.offerNote === 'string' ? item.offerNote.trim() : '';
  const empty = {currentPrice, currentNote, reference:null, included:[], clarify:[]};
  const project = projects.get(item?.id);
  if (!project || item.category !== project.category || normalizeSize(item.dimensions) !== normalizeSize(project.size)) return empty;
  const source = 'https://t.me/karkaswoodstroy/' + project.post;
  if (String(item.source ?? '').replace(/\/$/, '') !== source) return empty;
  const description = project.separateDelivery
    ? 'В этой публикации доставка и монтаж оплачиваются отдельно.'
    : 'Условия доставки и монтажа в публикации не указаны.';
  return {
    currentPrice, currentNote,
    reference:{price:project.price, date:project.date, source, description},
    included:[...project.included], clarify:[project.question || description]
  };
}

const rubles = new Intl.NumberFormat('ru-RU', {style:'currency',currency:'RUB',maximumFractionDigits:0});
const dateLabel = new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'});

export function comparisonPrice(item) {
  const {currentPrice, reference} = getOffer(item);
  if (currentPrice) return rubles.format(currentPrice) + ' · цена мастерской';
  if (reference) return rubles.format(reference.price) + ' · в публикации от ' + dateLabel.format(new Date(reference.date + 'T00:00:00Z'));
  return 'По запросу';
}
