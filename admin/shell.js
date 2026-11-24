import { loadPublicSite } from '../assets/site-data.js';
import { connectOwner } from './owner.js';
import { mountItems } from './items.js';
import { mountSettings } from './settings.js';
import { getOffer } from '../assets/project-offers.js';

const KEY = 'kw:site-draft:v1';
const labels = {
  overview: ['Обзор мастерской', 'Измените карточку или настройки, проверьте предпросмотр и опубликуйте результат.'],
  catalog: ['Каталог', 'Управляйте карточками, фотографиями и порядком моделей.'],
  settings: ['Настройки сайта', 'Оформление, контакты, реквизиты и параметры планировки.'],
};
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

function content(value) {
  if (!value?.settings || typeof value.settings !== 'object' || Array.isArray(value.settings) || !Array.isArray(value.items)) {
    throw Error('Не удалось прочитать каталог мастерской.');
  }
  return {settings: structuredClone(value.settings), items: structuredClone(value.items)};
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
const settingAnchors = {'settings/season':'kw-season', 'settings/legal':'kw-legal'};
let route = '';
function routeFromHash() {
  const key = location.hash.slice(1);
  return Object.hasOwn(labels,key) || Object.hasOwn(settingAnchors,key) ? key : 'overview';
}
function markNavigation(next) {
  for (const link of document.querySelectorAll('[data-nav]')) {
    if (link.dataset.nav === next) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
    link.classList.toggle('is-parent', link.dataset.nav === 'settings' && Boolean(settingAnchors[next]));
  }
}
function focusSection(next, focusHeading) {
  const group = document.getElementById(settingAnchors[next] || '');
  if (group) {
    const first = group.querySelector('input:checked') || group.querySelector('select, button, input, textarea');
    if (first) first.focus({preventScroll:true});
    group.scrollIntoView({block:'start',behavior:'instant'});
  } else if (focusHeading) {
    $('#section-title').focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'instant'});
  }
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
  const season=data?.settings.theme==='newyear'?'newyear':'classic';
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
function overview() {
  const visibleItems=data.items.filter(item=>item.published!==false);
  const winter=data.settings.theme==='newyear';
  const quick=element('nav','a-quick-grid');
  quick.setAttribute('aria-label','Быстрые действия');
  const add=actionLink('Добавить постройку','#catalog','add','Новая карточка с фото и ценой');
  add.classList.add('a-quick-primary'); add.dataset.newItem='';
  const catalogue=actionLink('Изменить каталог','#catalog','catalog','Цены, фотографии и порядок');
  const season=actionLink('Оформление и сезон','#settings/season','season','Обычный или новогодний вид');
  const legal=actionLink('Реквизиты','#settings/legal','doc','Данные продавца для покупателей');
  quick.append(add,catalogue,season,legal);

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

  const preview=element('section','a-box a-preview-card'), image=element('img','a-preview-photo');
  image.src=winter?'../assets/winter-hero.webp':'../assets/hero.webp';
  image.alt='';
  const body=element('div','a-preview-body'), settings=element('a','a-card-link','Настроить оформление');
  settings.href='#settings/season';
  body.append(element('h2','','Оформление сайта'),element('p','',winter?'Новогодний вид':'Обычный вид'),settings);
  preview.append(image,body); grid.append(listBox,preview); panel.replaceChildren(quick,priceOverview(visibleItems),grid);
}
function render(next=routeFromHash(), focus=false) {
  editor?.destroy?.(); editor=null; route=next; tab=next.split('/')[0]; setMenu(false);
  const [title,subtitle]=labels[tab];
  $('#section-title').textContent=title; $('#section-subtitle').textContent=subtitle;
  document.title=title+' · '+(data?.settings.brand || 'Karkaswood');
  markNavigation(next);
  if (!data) return;
  panel.replaceChildren();
  if (tab==='overview') overview();
  if (tab==='catalog') editor=mountItems(panel,{items:data.items,onChange:items=>changePart('items',items)});
  if (tab==='settings') {
    editor=mountSettings(panel,{settings:data.settings,onChange:settings=>changePart('settings',settings)});
    const legalPreview=element('a','a-inline kw-settings__wide','Посмотреть реквизиты в черновике');
    legalPreview.id='legal-preview';
    legalPreview.dataset.draftLink='';
    legalPreview.target='_blank';
    legalPreview.rel='noopener';
    $('#kw-legal .kw-settings__grid').append(legalPreview);
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
  if (tab==='settings' && editor?.validate && !editor.validate()) {
    notice('Проверьте отмеченные поля настроек.','error'); return false;
  }
  return true;
}
async function navigate(next) {
  if (busy || !data) return false;
  if (route===next) {setMenu(false); focusSection(next,false); return true;}
  const nextTab=next.split('/')[0];
  if (nextTab!==tab && pending() && !await confirmAction('Закрыть редактор?', 'Незавершённые правки в текущей форме будут потеряны.', 'Закрыть редактор')) return false;
  if (location.hash!=='#'+next) history.pushState(null,'','#'+next);
  if (nextTab===tab) {
    route=next;setMenu(false);markNavigation(next);focusSection(next,true);
  } else render(next,true);
  return true;
}
document.addEventListener('click',async event=>{
  const link=event.target.closest('a[href^="#"]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const target=link.hash.slice(1);
  if (!Object.hasOwn(labels,target) && !Object.hasOwn(settingAnchors,target)) return;
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
    continuePublish=afterLoginPublish && merged && dirty;
    accessDialog.close();render();
    if(merged)notice('Доступ владельца подключён. Можно публиковать изменения.');
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
    await setBase(published,'public');
    if(saved?.dirty===true && saved.scope==='owner'){
      deferredDraft=saved;
      notice('На этом устройстве сохранён черновик владельца. Войдите, чтобы продолжить редактирование.','info','Войти',()=>openAccess());
    }else if(saved?.dirty===true){
      data=content(saved);baseSha=saved.baseSha || null;baseDigest=saved.baseDigest || '';
      scope=saved.scope==='owner'?'owner':'public';dirty=true;savedAt=saved.updatedAt || '';
      notice('Восстановлен черновик с этого устройства.');
    }
    render();
  }catch{
    $('#panel').replaceChildren(element('p','a-loading','Не удалось загрузить каталог мастерской.'));
    notice('Проверьте подключение к интернету и попробуйте ещё раз.','error','Повторить',initialize);
  }
}
initialize();
