import { loadPublicSite } from '../assets/site-data.js';
import { connectOwner } from './owner.js';
import { mountItems } from './items.js';
import { mountSettings } from './settings.js';
import { getOffer } from '../assets/project-offers.js';
import { normalizeSite, resolveTheme, isHolidaySeason, SCHEMA, ITEM_EXTRA_KEYS } from '../assets/site-defaults.js';
import { getChannels } from '../assets/channels.js';

const KEY = 'kw:site-draft:v1';
const labels = {
  overview: ['Обзор мастерской', 'Измените карточку или настройки, проверьте предпросмотр и опубликуйте результат.'],
  catalog: ['Каталог', 'Постройки, цены, фотографии и порядок карточек.'],
  design: ['Оформление', 'Обычный или новогодний вид сайта.'],
  texts: ['Тексты сайта', 'Рассказ о мастерской, шаги заказа, материалы и ответы на вопросы.'],
  contacts: ['Контакты', 'Телефон, мессенджеры, режим работы и карта.'],
  legal: ['Реквизиты', 'Сведения о продавце для покупателей и договора.'],
  settings: ['Название и первый экран', 'Название мастерской, заголовок, объявление и параметры планировки.'],
  help: ['Помощь', 'Как устроена панель и что делать, если что-то пошло не так.'],
};
const settingTabs = new Set(['design', 'texts', 'contacts', 'legal', 'settings']);
// Прежние адреса разделов продолжают работать.
const aliases = {'settings/season': 'design', 'settings/legal': 'legal'};
const categories = { utility: 'Хозблоки', bath: 'Бани', cabin: 'Бытовки', house: 'Дома' };
const $ = selector => document.querySelector(selector);
const panel = $('#panel');
const accessDialog = $('#access-dialog');
const confirmDialog = $('#confirm-dialog');
const menuToggle = $('#menu-toggle');
const requestedSeason = new URLSearchParams(location.search).get('season');
const publicSeason = ['newyear','classic'].includes(requestedSeason) ? requestedSeason : null;
let data, base, baseSha = null, baseDigest = '', scope = 'public';
let dirty = false, owner = null, tab = '', editor = null, busy = false;
let conflict = false, storageBlocked = false, storedStamp = null, storageConflict = false;
let savedAt = '', hostSession = 0, afterLoginPublish = false;
let deferredDraft = null;
// Версия данных, которую хранит сервер. Вторая версия добавляет тексты сайта, галереи и комплектацию карточек.
let publicSchema = SCHEMA;
const extended = () => (owner ? owner.schema : publicSchema) >= SCHEMA;

function content(value) {
  if (!value?.settings || typeof value.settings !== 'object' || Array.isArray(value.settings) || !Array.isArray(value.items)) {
    throw Error('Не удалось прочитать каталог мастерской.');
  }
  const {settings, items} = normalizeSite(structuredClone({settings: value.settings, items: value.items}));
  return {settings, items};
}
// Возвращает расширенные поля к опубликованным значениям: сервер первой версии их не примет.
function dropExtended() {
  const before = JSON.stringify(canonical(data));
  const published = new Map(base.items.map(item => [item.id, item]));
  data = {
    settings: {...data.settings, extra: structuredClone(base.settings.extra)},
    items: data.items.map(item => {
      const copy = {...item}, origin = published.get(item.id) || {};
      for (const key of ITEM_EXTRA_KEYS) {
        if (origin[key] === undefined) delete copy[key];
        else copy[key] = structuredClone(origin[key]);
      }
      return copy;
    }),
  };
  dirty = JSON.stringify(canonical(data)) !== JSON.stringify(canonical(base));
  return before !== JSON.stringify(canonical(data));
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])]));
  return value;
}
async function digest(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(content(value))));
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2,'0')).join('');
}
function visible(doc) {
  return {settings:doc.settings,items:doc.items.filter(item=>item.published!==false)};
}
function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value!==undefined) node.textContent = String(value);
  return node;
}
function icon(id) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','a-icon'); svg.setAttribute('aria-hidden','true');
  const use = document.createElementNS(svg.namespaceURI,'use');
  use.setAttribute('href','#a-'+id); svg.append(use); return svg;
}
function notice(message,kind='info',action,callback) {
  const box = $('#notice'), link = $('#notice-action');
  box.hidden = !message; box.dataset.kind = kind;
  $('#notice-text').textContent = message || '';
  link.hidden = !action; link.textContent = action || ''; link.onclick = callback || null;
}
function confirmAction(title, message, submit) {
  if (confirmDialog.open) return Promise.resolve(false);
  $('#confirm-title').textContent = title; $('#confirm-copy').textContent = message;
  $('#confirm-submit').textContent = submit; confirmDialog.returnValue = '';
  return new Promise(resolve => {
    confirmDialog.addEventListener('close',()=>resolve(confirmDialog.returnValue==='confirm'),{once:true});
    confirmDialog.showModal();
  });
}
let route = '';
function routeFromHash() {
  const key = aliases[location.hash.slice(1)] || location.hash.slice(1);
  return Object.hasOwn(labels,key) ? key : 'overview';
}
function markNavigation(next) {
  for (const link of document.querySelectorAll('[data-nav]')) {
    if (link.dataset.nav === next) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  }
}
function focusSection(next, focusHeading) {
  if (!focusHeading) return;
  $('#section-title').focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'instant'});
}
function stamp() { return crypto.randomUUID(); }
function readSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || !Array.isArray(saved.items) || !saved.settings) return null;
    return saved;
  } catch {return null;}
}
function conflictMessage() {
  notice('Сохранённая версия сайта изменилась. Ваш черновик остался в панели. Чтобы продолжить с актуальной версией, загрузите её заново.','error','Загрузить с сайта',discard);
}
function storeDraft(force=false) {
  if (!data) return false;
  if (deferredDraft && !owner && !force) {
    storageBlocked=true; updateState();
    notice('На этом устройстве есть черновик владельца. Войдите для восстановления или замените его текущей демоверсией.', 'info', 'Заменить черновик', async()=>{
      if(await confirmAction('Заменить черновик владельца?', 'Сохранённые в этом браузере правки владельца будут заменены вашей демоверсией.', 'Заменить')){
        deferredDraft=null; if(storeDraft(true))notice('Демоверсия сохранена на устройстве.');
      }
    });
    return false;
  }
  try {
    const current = readSaved();
    if (!force && (current?.stamp || null)!==storedStamp) {
      storageConflict=true; updateState();
      notice('В другой вкладке сохранён более новый черновик. Правки этой вкладки остаются на экране.','error','Сохранить эту версию',async()=>{
        if (await confirmAction('Заменить локальный черновик?', 'Версия из другой вкладки на этом устройстве будет заменена текущей.', 'Заменить')) {
          storeDraft(true); if (!storageBlocked) notice('Текущая версия сохранена на устройстве.');
        }
      });
      return false;
    }
    const nextStamp=stamp(), nextTime=new Date().toISOString();
    localStorage.setItem(KEY,JSON.stringify({...data,scope,baseSha,baseDigest,dirty,updatedAt:nextTime,stamp:nextStamp}));
    storedStamp=nextStamp; savedAt=nextTime; storageBlocked=false; storageConflict=false; updateState(); return true;
  } catch {
    storageBlocked=true; updateState();
    notice('Браузеру не удалось сохранить черновик на устройстве. Оставьте вкладку открытой. Для предпросмотра уменьшите размер фотографий или освободите место.','error');
    return false;
  }
}
function removeSaved() {
  deferredDraft=null;
  // Preserve a newer local draft written by a second tab while the server was saving.
  const current=readSaved();
  if (!current || (current.stamp || null)===storedStamp) {
    try {localStorage.removeItem(KEY);} catch {}
    storedStamp=null;
  }
  savedAt=''; storageBlocked=false; storageConflict=false;
}
async function setBase(doc, nextScope) {
  base=content(doc); baseDigest=await digest(base);
  baseSha=doc.sha || null; scope=nextScope; data=content(base); dirty=false; conflict=false;
}
function changePart(key,value) {
  if(!conflict && !storageConflict && !storageBlocked) notice('');
  data={...data,[key]:structuredClone(value)};
  dirty=JSON.stringify(canonical(data))!==JSON.stringify(canonical(base));
  storeDraft(); updateState();
}
function setMenu(open) {
  $('#side-content').classList.toggle('is-open',open);
  menuToggle.setAttribute('aria-expanded',String(open));
}
function publicPage(path, season, draft=false) {
  const url=new URL(path,location.href);
  if (draft) url.searchParams.set('preview','draft');
  if (season) url.searchParams.set('season',season);
  return url.href;
}
$('#site-live').href=publicPage('../',publicSeason);
$('#privacy-live').href=publicPage('../info/#privacy',publicSeason);

function updateAppearance() {
  const season=data ? resolveTheme(data.settings) : 'classic';
  document.documentElement.dataset.adminSeason=season;
  $('meta[name="theme-color"]').content=season==='newyear'?'#183d40':'#20362a';
  $('#preview').href=publicPage('../',season,true);
  const legalPreview=$('#legal-preview');
  if (legalPreview) legalPreview.href=publicPage('../info/#details',season,true);
}
function updateState() {
  updateAppearance();
  $('#draft-bar').hidden=!data;
  $('#draft-bar').classList.toggle('has-draft',dirty);
  $('#mode').textContent=owner?'Режим владельца':'Деморежим';
  $('#account span').textContent=owner?'Владелец · выход':'Вход владельца';
  $('#publish').disabled=!data || busy || conflict || !dirty;
  $('#discard').hidden=!dirty && !conflict;
  $('#discard').disabled=busy;
  $('#preview').setAttribute('aria-disabled',String(!data || busy));
  $('#save-state').textContent=storageConflict?'Конфликт вкладок':storageBlocked?'Черновик только в памяти':
    (dirty ? 'Черновик на устройстве' + (savedAt ? ' · ' + new Date(savedAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}) : '')
           : owner ? 'Все изменения опубликованы' : 'Черновик сохранится в этом браузере. Публикация доступна владельцу.');
  $('#status-login').hidden=Boolean(owner);
  $('#status-login').disabled=busy;
  $('#signed-out').hidden=Boolean(owner); $('#signed-in').hidden=!owner;
  $('#access-title').textContent=owner?'Доступ владельца':'Вход владельца';
  $('#account-summary').textContent=owner?'Вы можете обновлять каталог и настройки на сайте покупателей.':'';
}
function safePhoto(src) {
  if (typeof src!=='string') return null;
  if (/^data:image\/(?:webp|jpeg|png);base64,[a-z0-9+/=]+$/i.test(src) && src.length<=220000) return src;
  if (/^assets\/[\w/.%+-]+$/i.test(src) && !src.includes('..')) return new URL('../'+src,location.href).href;
  try {const url=new URL(src); return url.protocol==='https:' && !url.username && !url.password ? url.href : null;} catch {return null;}
}
function actionLink(label, href, glyph, description) {
  const link=element('a','a-quick');
  link.href=href;
  const mark=element('span','a-quick-icon');
  mark.append(icon(glyph));
  const copy=element('span','a-quick-copy');
  copy.append(element('strong','',label),element('span','',description));
  link.append(mark,copy);
  return link;
}
function priceOverview(visibleItems) {
  const missing=visibleItems.filter(item=>getOffer(item).currentPrice===null);
  const section=element('section','a-box a-prices');
  section.setAttribute('aria-label','Цены в каталоге');
  if (!missing.length) {
    const status=visibleItems.length?'Для всех моделей в каталоге указана актуальная цена.':'Цены появятся здесь, когда вы добавите первую модель в каталог.';
    section.append(element('p','a-price-status',status));
    return section;
  }
  const details=element('details'), toggle=element('summary');
  toggle.append(element('strong','','Без актуальной цены'),element('span','a-price-count',missing.length+' из '+visibleItems.length),element('span','a-price-expand','Выбрать постройку'));
  const list=element('ul','a-price-list');
  for (const item of missing) {
    const row=element('li'), link=element('a');
    link.href='#catalog'; link.dataset.editId=item.id; link.dataset.editField='price';
    link.setAttribute('aria-label','Указать актуальную цену для проекта «'+item.name+'»');
    link.append(element('span','',item.name),icon('edit'));
    row.append(link); list.append(row);
  }
  details.append(toggle,list); section.append(details);
  return section;
}
// Латиница в названиях: закон требует русского текста для покупателей (статья 10.1 закона о защите прав потребителей).
const latinNames = [[/\bBARN\s*MAXI\b/gi,'«Барн Макси»'],[/\bBARN\s*MINI\b/gi,'«Барн Мини»'],[/\bBARN\b/gi,'«Барн»'],[/\bLOFT\b/gi,'«Лофт»'],[/\bOSB\b/gi,'ОСБ'],[/\bPVC\b/gi,'ПВХ']];
function russianName(name) {
  let result=name;
  for (const [pattern,replacement] of latinNames) result=result.replace(pattern,replacement);
  result=result.replace(/^«(Лофт|Барн[^»]*)»(?=\s+с\s)/,'Хозблок «$1»').replace(/\s{2,}/g,' ').trim();
  return /[a-z]/i.test(result) ? '' : result;
}
function siteChecks() {
  const settings=data.settings, legal=settings.legal || {}, channels=getChannels(settings);
  const shown=data.items.filter(item=>item.published!==false);
  const checks=[];
  const add=(ok,title,text,href,label,fix)=>checks.push({ok,title,text,href,label,fix});
  const seller=Boolean(String(legal.name||'').trim() && String(legal.inn||'').trim());
  add(seller,'Реквизиты продавца',seller?'Наименование и ИНН указаны.':'Укажите ФИО или наименование и ИНН. Покупатель вправе знать, с кем заключает договор.','#legal','Заполнить');
  const reach=Boolean(channels.email || String(legal.address||'').trim());
  add(reach,'Адрес или почта для обращений',reach?'Покупатель знает, куда направить обращение.':'Нужны для политики обработки персональных данных и претензий.','#legal','Указать');
  add(Boolean(channels.phone),'Телефон',channels.phone?'Звонок и СМС работают, даже когда мессенджеры недоступны.':'Добавьте номер: это единственный способ связи, который не зависит от мессенджеров.','#contacts','Добавить');
  const backup=Boolean(channels.max || channels.whatsapp || channels.vk || channels.email);
  add(backup,'Запасной способ связи',backup?'Кроме Telegram указан ещё один канал.':'Telegram в России работает с перебоями. Добавьте MAX, ВКонтакте или почту, если пользуетесь ими.','#contacts','Добавить');
  add(Boolean(channels.hours),'Режим работы',channels.hours?'Время работы показано в контактах.':'Подскажите покупателям, когда можно звонить и приезжать.','#contacts','Указать');
  const latin=shown.filter(item=>/[a-z]/i.test(item.name));
  const fixable=latin.filter(item=>russianName(item.name));
  add(!latin.length,'Названия на русском',latin.length?'Латиница в названиях: '+latin.map(item=>item.name).join(', ')+'.':'В названиях построек нет латиницы.','#catalog',fixable.length?'':'Открыть каталог',
    fixable.length ? {label:'Перевести названия',run(){
      changePart('items',data.items.map(item=>latin.includes(item) && russianName(item.name) ? {...item,name:russianName(item.name)} : item));
      render(); notice('Названия переведены в черновике. Проверьте их и нажмите «Опубликовать».');
    }} : null);
  const priced=shown.filter(item=>getOffer(item).currentPrice!==null).length;
  add(shown.length>0 && priced===shown.length,'Актуальные цены',!shown.length?'В каталоге пока нет построек.':priced===shown.length?'У всех построек указана актуальная цена.':'Без актуальной цены — '+(shown.length-priced)+' из '+shown.length+'. Покупатель видит цену из старой публикации с датой.','#catalog','Открыть каталог');
  add(extended(),'Сервер сайта',extended()?'Сервер хранит все разделы панели.':'Работает прежняя версия сервера: тексты сайта, галереи и комплектация карточек пока не публикуются. Нужен разработчик.','#help','Что делать');
  return checks;
}
function checklist() {
  const checks=siteChecks(), open=checks.filter(check=>!check.ok);
  const section=element('section','a-box a-checks');
  const header=element('div','a-box-heading');
  header.append(element('h2','','Проверка сайта'),element('span','a-check-score'+(open.length?'':' is-done'),open.length?'Осталось: '+open.length:'Всё готово'));
  const list=element('ul','a-check-list');
  for (const check of [...open,...checks.filter(check=>check.ok)]) {
    const row=element('li','a-check'+(check.ok?' is-ok':''));
    const mark=element('span','a-check-mark'); mark.append(icon(check.ok?'check':'alert'));
    const copy=element('div','a-check-copy');
    copy.append(element('strong','',check.title),element('span','',check.text));
    row.append(mark,copy);
    if (!check.ok && check.fix) {
      const button=element('button','a-btn a-secondary a-check-action',check.fix.label);
      button.type='button'; button.addEventListener('click',check.fix.run); row.append(button);
    } else if (!check.ok && check.label) {
      const link=element('a','a-btn a-secondary a-check-action',check.label);
      link.href=check.href; row.append(link);
    }
    list.append(row);
  }
  section.append(header,list);
  return section;
}
function seasonCard() {
  const automatic=extended() && data.settings.extra?.themeMode==='auto';
  const winter=resolveTheme(data.settings)==='newyear';
  const card=element('section','a-box a-season'+(winter?' is-winter':''));
  const image=element('img','a-preview-photo');
  image.src=winter?'../assets/winter-hero.webp':'../assets/hero.webp'; image.alt='';
  const body=element('div','a-season-body');
  const toggle=element('button','kw-switch'); toggle.type='button'; toggle.id='season-switch';
  toggle.setAttribute('role','switch'); toggle.setAttribute('aria-checked',String(winter)); toggle.disabled=automatic;
  const track=element('span','kw-switch__track'); track.append(element('span','kw-switch__thumb'));
  toggle.append(track,element('span','kw-switch__state',winter?'Включено':'Выключено'));
  const label=element('label','','Новогоднее оформление'); label.htmlFor=toggle.id;
  const row=element('div','kw-switch-row'); const copy=element('div','kw-switch-copy');
  copy.append(label,element('p','',automatic
    ? 'Включается само с 1 декабря по 14 января. Сегодня сайт показывает '+(winter?'новогоднее':'обычное')+' оформление.'
    : winter?'Зимняя обложка, гирлянда и снег. Выключите после праздников.':'Включите к праздникам: сайт сменит обложку и цвета.'));
  row.append(toggle,copy);
  toggle.addEventListener('click',()=>{
    changePart('settings',{...data.settings,theme:winter?'classic':'newyear'});
    render(); document.getElementById('season-switch')?.focus();
    notice(winter?'Обычное оформление включено в черновике. Нажмите «Опубликовать», чтобы его увидели покупатели.':'Новогоднее оформление включено в черновике. Нажмите «Опубликовать», чтобы его увидели покупатели.');
  });
  const more=element('a','a-card-link','Все настройки оформления'); more.href='#design';
  body.append(element('h2','','Оформление сайта'),row,more);
  if (!automatic && !winter && isHolidaySeason()) body.append(element('p','a-season-tip','Сейчас праздничные дни — самое время включить.'));
  if (!automatic && winter && !isHolidaySeason() && new Date().getMonth()+1!==11) body.append(element('p','a-season-tip','Праздники прошли — можно вернуть обычное оформление.'));
  card.append(image,body);
  return card;
}
function overview() {
  const visibleItems=data.items.filter(item=>item.published!==false);
  const quick=element('nav','a-quick-grid');
  quick.setAttribute('aria-label','Быстрые действия');
  const add=actionLink('Добавить постройку','#catalog','add','Новая карточка с фото и ценой');
  add.classList.add('a-quick-primary'); add.dataset.newItem='';
  const catalogue=actionLink('Изменить цены и фото','#catalog','catalog','Карточки каталога и их порядок');
  const texts=actionLink('Тексты сайта','#texts','doc','О мастерской, вопросы и ответы');
  const contacts=actionLink('Контакты','#contacts','phone','Телефон, мессенджеры, режим работы');
  quick.append(add,catalogue,texts,contacts);

  const grid=element('div','a-overview'), listBox=element('section','a-box'), header=element('div','a-box-heading');
  const edit=element('a','','Весь каталог'); edit.href='#catalog';
  header.append(element('h2','','Постройки мастерской'),edit); listBox.append(header);
  const facts=element('p','a-list-stats');
  facts.append(element('span','','Всего: '+data.items.length),element('span','','Показываются: '+visibleItems.length),element('span','','Скрыты: '+(data.items.length-visibleItems.length)));
  listBox.append(facts);
  const list=element('ul','a-list');
  for (const item of data.items.slice(0,4)) {
    const li=element('li'), link=element('a','a-item-action');
    link.href='#catalog'; link.dataset.editId=item.id;
    link.setAttribute('aria-label','Редактировать: '+item.name);
    const thumb=element('span','a-thumb'), desc=element('span','a-item-text');
    const photo=safePhoto(item.photo);
    if (photo) {
      const img=element('img'); img.alt=''; img.src=photo;
      img.addEventListener('error',()=>thumb.replaceChildren(icon('home')),{once:true}); thumb.append(img);
    } else thumb.append(icon('home'));
    desc.append(element('strong','',item.name),element('small','',categories[item.category] || 'Модель'));
    const tag=element('span','a-visibility',item.published===false?'Скрыта':'В каталоге');
    if (item.published===false) tag.classList.add('hidden-item');
    link.append(thumb,desc,tag,icon('edit')); li.append(link); list.append(li);
  }
  if (data.items.length) listBox.append(list);
  else {
    const empty=element('div','a-empty');
    const first=element('a','a-card-link','Добавить первую постройку'); first.href='#catalog'; first.dataset.newItem='';
    empty.append(element('p','','В каталоге пока нет построек.'),first); listBox.append(empty);
  }
  const side=element('div','a-overview-side');
  side.append(seasonCard());
  grid.append(listBox,side); panel.replaceChildren(quick,checklist(),priceOverview(visibleItems),grid);
}
function help() {
  const box=element('section','a-box a-help');
  const blocks=[
    ['Как изменить сайт','Откройте нужный раздел слева, внесите правки и нажмите «Предпросмотр» — сайт откроется в новой вкладке с вашими изменениями. Покупатели увидят их только после кнопки «Опубликовать».'],
    ['Черновик','Всё, что вы меняете, сразу сохраняется в этом браузере как черновик. Можно закрыть вкладку и вернуться позже с этого же устройства. Кнопка «Отменить изменения» возвращает опубликованную версию.'],
    ['Вход владельца','Публиковать может только владелец. Нажмите «Вход владельца» и введите пароль мастерской. Сеанс длится 4 часа, после этого пароль нужно ввести снова. Без пароля панель работает в деморежиме: правки видны только вам.'],
    ['Новая постройка','Раздел «Каталог» → «Добавить карточку». Заполните название, размеры и цену, на вкладке «Фото» загрузите снимки с телефона — панель сама уменьшит их. Галочка «Показывать в каталоге» управляет видимостью.'],
    ['Цены','В карточке есть поле «Актуальная цена». Пока оно пустое, покупатель видит цену из публикации в канале с датой. Указанные цены — справочные: в подвале сайта написано, что они не являются публичной офертой.'],
    ['Новогоднее оформление','Переключатель есть на странице «Обзор» и в разделе «Оформление». Можно включать вручную или поставить галочку «Включать само по календарю» — тогда сайт сменит вид 1 декабря и вернёт обычный 15 января.'],
    ['Если не публикуется','Проверьте интернет и войдите заново. Сообщение «Каталог уже изменился» значит, что сайт правили с другого устройства: нажмите «Загрузить с сайта» и внесите правки ещё раз.'],
    ['Если поля закрыты замком','Сервер сайта работает на прежней версии и не хранит новые разделы: тексты сайта, галереи и комплектацию карточек. Передайте разработчику файл docs/DEPLOY.md из репозитория — обновление занимает несколько минут.'],
  ];
  for (const [title,text] of blocks) {
    const item=element('details','a-help-item');
    item.append(element('summary','',title),element('p','',text));
    box.append(item);
  }
  box.firstElementChild.open=true;
  panel.replaceChildren(box);
}
function render(next=routeFromHash(), focus=false) {
  editor?.destroy?.(); editor=null; route=next; tab=next; setMenu(false);
  const [title,subtitle]=labels[tab];
  $('#section-title').textContent=title; $('#section-subtitle').textContent=subtitle;
  document.title=title+' · '+(data?.settings.extra?.brandRu || data?.settings.brand || 'Каркасвуд');
  markNavigation(next);
  if (!data) return;
  panel.replaceChildren();
  if (tab==='overview') overview();
  if (tab==='help') help();
  if (tab==='catalog') editor=mountItems(panel,{items:data.items,extended:extended(),onChange:items=>changePart('items',items)});
  if (settingTabs.has(tab)) {
    editor=mountSettings(panel,{settings:data.settings,section:tab,extended:extended(),onChange:settings=>changePart('settings',settings)});
    if (tab==='legal') {
      const legalPreview=element('a','a-inline kw-settings__wide','Посмотреть реквизиты в черновике');
      legalPreview.id='legal-preview';
      legalPreview.dataset.draftLink='';
      legalPreview.target='_blank';
      legalPreview.rel='noopener';
      $('#kw-legal .kw-settings__grid').append(legalPreview);
    }
  }
  focusSection(next,focus);
  updateState();
}
function pending() {
  return Boolean(editor?.hasPendingChanges?.()) || Boolean(panel.querySelector('[aria-invalid="true"]'));
}
function readyForAction() {
  if(editor?.hasPendingChanges?.()){
    notice('Сначала сохраните карточку или отмените изменения в её форме.','error');
    return false;
  }
  if (settingTabs.has(tab) && editor?.validate && !editor.validate()) {
    notice('Проверьте отмеченные поля.','error'); return false;
  }
  return true;
}
async function navigate(next) {
  if (busy || !data) return false;
  if (route===next) {setMenu(false); return true;}
  if (pending() && !await confirmAction('Закрыть редактор?', 'Незавершённые правки в текущей форме будут потеряны.', 'Закрыть редактор')) return false;
  if (location.hash!=='#'+next) history.pushState(null,'','#'+next);
  render(next,true);
  return true;
}
document.addEventListener('click',async event=>{
  const link=event.target.closest('a[href^="#"]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const target=aliases[link.hash.slice(1)] || link.hash.slice(1);
  if (!Object.hasOwn(labels,target)) return;
  event.preventDefault();
  if (!await navigate(target)) return;
  if (link.hasAttribute('data-new-item')) editor?.openNew?.();
  if (link.dataset.editId) editor?.openItem?.(link.dataset.editId,link.dataset.editField);
});
window.addEventListener('hashchange',async()=>{
  const next=routeFromHash();
  if (next===route || !data) return;
  if (!await navigate(next)) history.replaceState(null,'','#'+(route||'overview'));
});
function openAccess(forPublication=false) {
  if (busy || !readyForAction()) return;
  afterLoginPublish=forPublication;$('#access-error').textContent='';updateState();
  accessDialog.showModal();
  if(!owner)$('#owner-password').focus();
}
menuToggle.addEventListener('click',()=>setMenu(menuToggle.getAttribute('aria-expanded')!=='true'));
$('#account').addEventListener('click',()=>openAccess());
$('#status-login').addEventListener('click',()=>openAccess());
accessDialog.querySelector('[data-close]').addEventListener('click',()=>accessDialog.close());
accessDialog.addEventListener('close',()=>{$('#owner-password').value='';hostSession++;});
document.addEventListener('click',event=>{
  if (!event.target.closest('[data-draft-link]')) return;
  if (!data || busy || !readyForAction() || !storeDraft()) event.preventDefault();
});
async function discard(){
  if (busy || !data) return;
  if (!await confirmAction('Загрузить сохранённую версию?', 'Локальные изменения будут заменены текущим содержимым сайта.', 'Загрузить с сайта')) return;
  busy=true; updateState(); setEditingLocked(true);
  try{
    const doc=owner ? await owner.load() : await loadPublicSite();
    if(!owner)publicSchema=doc.schema;
    await setBase(doc,owner?'owner':'public'); removeSaved(); render();
    notice('Загружена сохранённая версия.');
  }catch(error){notice(error.message || 'Не удалось загрузить сайт. Черновик сохранён.','error');}
  finally{busy=false;setEditingLocked(false);updateState();}
}
$('#discard').addEventListener('click',discard);
function mergePrivateCards(localItems, remoteItems) {
  const merged=localItems.slice();
  const ids=new Set(merged.map(item=>item.id));
  for(let i=0;i<remoteItems.length;i++){
    const item=remoteItems[i];
    if (item.published!==false)continue;
    if(ids.has(item.id))return null;
    const nextVisible=remoteItems.slice(i+1).find(other=>other.published!==false && ids.has(other.id));
    const index=nextVisible?merged.findIndex(other=>other.id===nextVisible.id):merged.length;
    merged.splice(index,0,structuredClone(item));ids.add(item.id);
  }
  return merged;
}
function setEditingLocked(locked){
  panel.inert=locked;
  $('#account').disabled=locked;
}
async function adoptOwner(remote) {
  const remoteDoc=content(remote);
  if(!dirty){await setBase(remote,'owner');removeSaved();return true;}
  const projected=scope==='owner'?remoteDoc:visible(remoteDoc);
  const sameBase=baseSha && scope==='owner' && baseSha===remote.sha || baseDigest && baseDigest===await digest(projected);
  if(!sameBase){conflict=true;conflictMessage();return false;}
  if(scope==='public'){
    const items=mergePrivateCards(data.items,remoteDoc.items);
    if(!items){conflict=true;conflictMessage();return false;}
    data={...data,items};
  }
  base=remoteDoc;baseSha=remote.sha;baseDigest=await digest(base);scope='owner';conflict=false;
  storeDraft();return true;
}
$('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const currentSession=++hostSession;
  const password=$('#owner-password').value;
  $('#owner-password').value='';$('#access-error').textContent='';
  busy=true;$('#connect').disabled=true;$('#connect').textContent='Входим…';setEditingLocked(true);updateState();
  let session;let continuePublish=false;
  try{
    session=await connectOwner(password);
    const remote=await session.load();
    if(!accessDialog.open || currentSession!==hostSession){session.logout();return;}
    if(deferredDraft){
      if(dirty && !await confirmAction('Восстановить черновик владельца?', 'Текущие несохранённые демоправки будут заменены черновиком владельца на этом устройстве.', 'Восстановить')){
        session.logout(); return;
      }
      const restored=deferredDraft;
      data=content(restored);baseSha=restored.baseSha || null;baseDigest=restored.baseDigest || '';
      dirty=true;scope='owner';deferredDraft=null;
    }
    const merged=await adoptOwner(remote);
    owner=session;
    const trimmed=merged && !extended() && dropExtended();
    if(trimmed)storeDraft(true);
    continuePublish=afterLoginPublish && merged && dirty && !trimmed;
    accessDialog.close();render();
    if(merged)notice(trimmed
      ? 'Доступ владельца подключён. Сервер прежней версии не хранит тексты сайта, галереи и комплектацию карточек, поэтому эти правки не сохранены. Остальное можно публиковать.'
      : 'Доступ владельца подключён. Можно публиковать изменения.',trimmed?'error':'info');
  }catch(error){
    session?.logout?.();
    if(accessDialog.open)$('#access-error').textContent=error.message || 'Не удалось выполнить вход.';
  }finally{
    busy=false;$('#connect').disabled=false;$('#connect').textContent='Войти';setEditingLocked(false);updateState();
  }
  if(continuePublish)await publish();
});
$('#logout').addEventListener('click',async()=>{
  if(!owner || busy)return;
  accessDialog.close();
  if((dirty || pending()) && !await confirmAction('Выйти из панели?', 'Черновик владельца будет удалён с этого устройства. Опубликованный сайт сохранится.', 'Выйти'))return;
  owner.logout();owner=null;hostSession++;removeSaved();
  const clientVisible=visible(base || data);
  await setBase(clientVisible,'public');render();notice('Вы вышли. Панель открыта в деморежиме.');
});
async function publish() {
  if (!data || busy || !dirty || !readyForAction())return;
  if (conflict) {conflictMessage();return;}
  if(storageConflict){notice('В другой вкладке есть более новый черновик. Сначала сохраните, какую версию оставить.','error');storeDraft();return;}
  if(!owner){openAccess(true);return;}
  if (!await confirmAction('Опубликовать изменения?', 'Покупатели увидят текущие карточки и настройки сайта. Скрытые модели останутся в панели.', 'Опубликовать'))return;
  busy=true;setEditingLocked(true);updateState();
  $('#publish').setAttribute('aria-busy','true');
  const publishText=$('#publish').lastChild;
  publishText.textContent='Публикуем…';
  try {
    const snapshot=content(data);
    const result=await owner.publish(snapshot,baseSha);
    let fresh, refreshed=true;
    try { fresh=await owner.load(); }
    catch { fresh={...snapshot,sha:result.sha}; refreshed=false; }
    await setBase(fresh,'owner');removeSaved();render();
    notice(refreshed ? 'Изменения опубликованы. Проверьте результат на сайте для покупателей.' : 'Сайт принял изменения. Обновить данные панели сейчас не удалось.');
  }catch(error){
    if(error.code==='conflict'){conflict=true;conflictMessage();}
    else if(error.code==='auth'){
      owner.logout();owner=null;
      notice('Время входа истекло. Черновик сохранён. Войдите снова для публикации.','error','Войти',()=>openAccess());
    }else notice(error.message || 'Не удалось опубликовать изменения. Черновик сохранён.','error');
  }finally{
    busy=false;setEditingLocked(false);updateState();
    $('#publish').removeAttribute('aria-busy');publishText.textContent='Опубликовать';
  }
}
$('#publish').addEventListener('click',publish);
window.addEventListener('beforeunload',event=>{
  if(pending() || busy || storageBlocked || storageConflict){event.preventDefault();event.returnValue='';}
});
async function initialize(){
  const saved=readSaved();storedStamp=saved?.stamp || null;
  try{
    const published=await loadPublicSite();
    publicSchema=published.schema;
    await setBase(published,'public');
    if(saved?.dirty===true && saved.scope==='owner'){
      deferredDraft=saved;
      notice('На этом устройстве сохранён черновик владельца. Войдите, чтобы продолжить редактирование.','info','Войти',()=>openAccess());
    }else if(saved?.dirty===true){
      data=content(saved);baseSha=saved.baseSha || null;baseDigest=saved.baseDigest || '';
      scope=saved.scope==='owner'?'owner':'public';dirty=true;savedAt=saved.updatedAt || '';
      if(!extended())dropExtended();
      notice('Восстановлен черновик с этого устройства.');
    }
    render();
  }catch{
    $('#panel').replaceChildren(element('p','a-loading','Не удалось загрузить каталог мастерской.'));
    notice('Проверьте подключение к интернету и попробуйте ещё раз.','error','Повторить',initialize);
  }
}
initialize();
