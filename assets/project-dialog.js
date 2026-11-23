import { getTourId } from './tour-registry.js';

const styleURL = new URL('./project-dialog.css', import.meta.url).href;
const paths = {
  close:'m6 6 12 12M18 6 6 18', cube:'m12 2 9 5v10l-9 5-9-5V7l9-5Zm-9 5 9 5 9-5m-9 5v10',
  photo:'M3 5h18v14H3z M4 17l5-5 4 3 4-5 4 6 M7 9h1',
  outside:'M3 10 12 4l9 6v10H3z M9 20v-7h6v7',
  inside:'m3 17 9 4 9-4M3 17V8l9 4 9-4v9m-9-5v9M3 8l9-5 9 5',
  plan:'M3 5h18v14H3V5Zm10 0v5m0 3v6m0-5h4',
  left:'M14.5 5.5 8.5 12l6 6.5', right:'M9.5 5.5l6 6.5-6 6.5',
  reset:'M4.5 10a7.8 7.8 0 1 1 .1 5M4.5 4.5v5.7h5.7',
  orbit:'M4 9c-1.4 1.7-1.4 3.8 0 5.4 2.8 3.3 9.2 4.2 13.6 1.6 3-1.8 3.6-4.4 1.7-6.8M14 15.5l4 .8-1 3.8 M9 8l5 3-5 3z',
  pause:'M8.5 5v14m7-14v14',
  chat:'M3 4.5h18v13H11l-5 3.5v-3.5H3z M7 9h10m-10 4h6',
  link:'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-2 2 M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 1 0 6 6l2-2',
  ruler:'m3 16 13-13 5 5L8 21zM7.5 11.5 10 14m1-6 2.5 2.5m1-6L17 7',
};
const categories = {utility:'Хозблок',bath:'Баня',cabin:'Бытовка',house:'Дом'};
let openTour = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
function svg(name) {
  const namespace='http://www.w3.org/2000/svg';
  const icon=document.createElementNS(namespace,'svg'), path=document.createElementNS(namespace,'path');
  icon.setAttribute('viewBox','0 0 24 24'); icon.setAttribute('aria-hidden','true'); icon.classList.add('kw-tour-icon');
  path.setAttribute('d',paths[name]); icon.append(path); return icon;
}
function button(className, glyph, text, label) {
  const node=el('button',className); node.type='button';
  if (glyph) node.append(svg(glyph));
  if (text) node.append(el('span','',text));
  if (label) {node.setAttribute('aria-label',label);node.title=label;}
  return node;
}
function ensureStyle() {
  if (Array.from(document.querySelectorAll('link[rel~="stylesheet"]')).some(link=>link.href===styleURL)) return;
  const link=el('link'); link.rel='stylesheet'; link.href=styleURL; document.head.append(link);
}
function photoURL(value) {
  if (typeof value!=='string' || /[\u0000-\u001f\\]/u.test(value)) return '';
  if (/^data:image\/(?:webp|png|jpeg);base64,[a-z0-9+/=]+$/i.test(value) && value.length<=250000) return value;
  if (!value.trim()) return '';
  try {
    const url=new URL(value,document.baseURI);
    if (url.username || url.password) return '';
    if (url.protocol==='https:' || url.protocol==='http:' && url.origin===location.origin) return url.href;
  } catch {}
  return '';
}

export function openProjectTour(item, trigger, onContact) {
  if (!item || typeof item.id!=='string' || !item.id) return null;
  ensureStyle();
  if (openTour) openTour(false);
  const opener=trigger instanceof HTMLElement ? trigger : document.activeElement;
  const photo=photoURL(item.photo);
  const dialog=el('dialog','kw-project-tour');
  dialog.setAttribute('aria-labelledby','kw-tour-title');
  const header=el('header','kw-tour-header'), heading=el('div','kw-tour-heading');
  heading.append(el('p','kw-tour-eyebrow','Обзор проекта'));
  const title=el('h2','kw-tour-title',item.name || 'Проект мастерской'); title.id='kw-tour-title';
  heading.append(title);
  const close=button('kw-tour-tool kw-tour-close','close',null,'Закрыть обзор'); close.dataset.tourClose=''; close.autofocus=true;
  header.append(heading,close);
  const layout=el('div','kw-tour-layout'), visual=el('div','kw-tour-visual');
  const switcher=el('div','kw-tour-switch'); switcher.setAttribute('role','group'); switcher.setAttribute('aria-label','Способ просмотра');
  const modelMode=button('kw-tour-mode','cube','3D-модель'),photoMode=button('kw-tour-mode','photo','Фото');
  modelMode.dataset.tourMode='model';photoMode.dataset.tourMode='photo';switcher.append(modelMode,photoMode);
  if (!photo) photoMode.hidden=true;
  const stage=el('div','kw-tour-stage'), scene=el('div','kw-tour-scene'); scene.setAttribute('aria-label','Трёхмерная модель проекта');
  const figure=el('figure','kw-tour-photo'); figure.hidden=true;
  const photoStatus=el('p','kw-tour-photo-status','Загружаем фотографию…'); photoStatus.setAttribute('role','status');
  const image=el('img'); image.alt=item.name?'Фото производителя. '+item.name:'Фотография проекта производителя'; image.decoding='async';
  figure.append(image,photoStatus);
  const stateBox=el('div','kw-tour-state'), stateLine=el('p','','Загружаем 3D-модель…');
  stateLine.setAttribute('role','status');stateBox.append(stateLine);
  const retry=button('kw-tour-retry',null,'Попробовать снова'); retry.hidden=true;
  stateBox.append(retry);
  const tools=el('div','kw-tour-tools'); tools.setAttribute('role','group'); tools.setAttribute('aria-label','Вращение модели'); tools.hidden=true;
  const rotateLeft=button('kw-tour-tool','left',null,'Повернуть модель влево'),rotateRight=button('kw-tour-tool','right',null,'Повернуть модель вправо');
  const reset=button('kw-tour-tool','reset',null,'Восстановить ракурс'),auto=button('kw-tour-tool','orbit',null,'Включить автовращение');
  rotateLeft.dataset.tourTurn='left';rotateRight.dataset.tourTurn='right';reset.dataset.tourReset='';auto.dataset.tourAuto='';
  tools.append(rotateLeft,rotateRight,reset,auto);
  stage.append(scene,figure,stateBox,tools);
  const footer=el('div','kw-tour-visual-foot');
  const views=el('div','kw-tour-views');views.setAttribute('role','group');views.setAttribute('aria-label','Вид модели');
  const viewButtons=new Map();
  for (const [key,label] of [['outside','Снаружи'],['inside','В разрезе'],['plan','План']]) {
    const btn=button('kw-tour-view',key,label);btn.dataset.tourView=key;views.append(btn);viewButtons.set(key,btn);
  }
  const hint=el('p','kw-tour-hint','Потяните, чтобы повернуть');
  const credit=el('p','kw-tour-credit','Фотография мастерской Karkaswood');credit.hidden=true;
  footer.append(views,hint,credit);visual.append(switcher,stage,footer);
  const side=el('aside','kw-tour-side');
  if (Object.hasOwn(categories,item.category)) side.append(el('p','kw-tour-kind',categories[item.category]));
  if (item.dimensions) {
    const dims=el('div','kw-tour-dims');dims.append(svg('ruler'),el('span','',item.dimensions));
    side.append(dims);
  }
  if (item.summary) side.append(el('p','kw-tour-summary',item.summary));
  const explanation=el('section','kw-tour-explanation');explanation.hidden=true;
  const note=el('p');explanation.append(el('h3','','О 3D-модели'),note);side.append(explanation);
  const contact=button('kw-tour-contact','chat','Обсудить проект');contact.dataset.tourContact='';
  const actions=el('div','kw-tour-actions');
  if (typeof onContact==='function') actions.append(contact);
  let copyLink=null, linkField=null, linkFeedback=null, shareURL=null;
  const localHost=/^(?:127\.|localhost$|\[::1\]$)/i.test(location.hostname) || location.hostname.endsWith('.localhost');
  if (/^https?:$/.test(location.protocol) && !localHost && new URLSearchParams(location.search).get('preview')!=='draft'){
    shareURL=new URL(location.pathname,location.origin);
    shareURL.searchParams.set('project',item.id);
    copyLink=button('kw-tour-share','link','Скопировать ссылку');copyLink.dataset.tourShare='';
    linkFeedback=el('p','kw-tour-share-feedback');linkFeedback.setAttribute('role','status');
    linkField=el('input','kw-tour-link-field');linkField.type='url';linkField.readOnly=true;linkField.hidden=true;
    linkField.setAttribute('aria-label','Ссылка на проект');linkField.value=shareURL.href;
    actions.append(copyLink,linkField,linkFeedback);
  }
  if(actions.childElementCount)side.append(actions);
  layout.append(visual,side);dialog.append(header,layout);
  document.body.append(dialog);

  let viewer=null, mode='model', view='outside', autoActive=false, mounted=false;
  let pending=false, disposed=false, canRender=true, loadAttempt=0;
  let timeout=0, photoTimer=0, sceneError='', photoStarted=false, photoFailed=false;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');

  function sync() {
    dialog.dataset.mode=mode;
    modelMode.setAttribute('aria-pressed',String(mode==='model'));photoMode.setAttribute('aria-pressed',String(mode==='photo'));
    scene.classList.toggle('kw-tour-scene-off',mode!=='model');scene.inert=mode!=='model';
    figure.hidden=mode!=='photo';tools.hidden=!mounted || mode!=='model';
    views.hidden=mode!=='model';views.querySelectorAll('button').forEach(btn=>{btn.disabled=!mounted;btn.setAttribute('aria-pressed',String(btn.dataset.tourView===view));});
    hint.hidden=mode!=='model' || !mounted; credit.hidden=mode!=='photo' || photoFailed;
    stateBox.hidden=mode!=='model' || mounted;
    retry.hidden=pending || !canRender || !sceneError;
    stateLine.textContent=sceneError || 'Загружаем 3D-модель…';
    auto.disabled=reduced.matches || view==='plan';
    const title=auto.disabled?(reduced.matches?'Автовращение отключено настройками движения':'Автовращение доступно для объёмного вида'):(autoActive?'Остановить автовращение':'Включить автовращение');
    auto.setAttribute('aria-label',title);auto.title=title;auto.setAttribute('aria-pressed',String(autoActive));
    if (auto.dataset.active!==String(autoActive)) { auto.replaceChildren(svg(autoActive?'pause':'orbit')); auto.dataset.active=String(autoActive); }
  }
  function stopSpin() {
    autoActive=false;viewer?.setAutoRotate(false);
  }
  function setMode(next) {
    if(disposed || next==='photo' && !photo)return;
    mode=next;
    if(mode==='photo'){
      stopSpin();
      if(!photoStarted){
        photoStarted=true;image.src=photo;
        photoTimer=window.setTimeout(()=>{
          if(!disposed && !image.complete)photoStatus.textContent='Фотография загружается дольше обычного.';
        },10000);
      }
    }
    sync();
    if(mode==='model' && !viewer && !pending && canRender && !sceneError) load();
    else if(mode==='model') viewer?.resize?.();
  }
  function setView(next) {
    if(!mounted || !viewButtons.has(next))return;
    stopSpin();view=next;viewer.setView(next);sync();
  }
  function finish(restore=true) {
    if(disposed)return;
    disposed=true;loadAttempt++;clearTimeout(timeout);clearTimeout(photoTimer);
    document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pageHide);reduced.removeEventListener('change',motionChanged);
    if(dialog.open) dialog.close();
    try { viewer?.dispose(); } finally {
      viewer=null; dialog.remove(); if(openTour===finish)openTour=null;
      if(restore && opener?.isConnected && typeof opener.focus==='function')opener.focus({preventScroll:true});
    }
  }
  function pageHide(){finish(false);}
  function visibility(){if(document.hidden){stopSpin();sync();}}
  function motionChanged(){if(reduced.matches)stopSpin();sync();}
  function handleContact() {
    finish(true);
    if(typeof onContact==='function')onContact(item,opener);
  }
  function fail(message, retryAllowed=true) {
    pending=false;sceneError=message;canRender=retryAllowed;
    stateLine.textContent=message;
    if(!retryAllowed)modelMode.disabled=true;
    if(!retryAllowed && photo) setMode('photo'); else sync();
  }
  async function load() {
    if(disposed || pending || viewer || !canRender) return;
    const attempt=++loadAttempt;pending=true;sceneError='';sync();
    const isCurrent=()=>!disposed && loadAttempt===attempt;
    clearTimeout(timeout);
    timeout=window.setTimeout(()=>{
      if(!isCurrent())return;
      loadAttempt++;
      fail('Не удалось дождаться 3D-модели. Проверьте подключение.');
    },12000);
    try{
      const {projectDefinitions}=await import('./project-definitions.js');
      if(!isCurrent())return;
      const modelId=getTourId(item);
      const definition=modelId && Object.hasOwn(projectDefinitions,modelId)?projectDefinitions[modelId]:null;
      if(!definition){
        clearTimeout(timeout);fail(photo?'Для этого проекта пока доступна фотография.':'3D-модель для этого проекта ещё не добавлена.',false);return;
      }
      note.textContent=typeof definition.note==='string' && definition.note.trim() ? definition.note : 'Схема по фотографиям. Высота, положение проёмов и внутренних перегородок ориентировочные.';
      explanation.hidden=false;
      if(mode!=='model'){clearTimeout(timeout);pending=false;sync();return;}
      const {mountProjectViewer}=await import('./project-viewer.js');
      if(!isCurrent())return;
      if(mode!=='model'){clearTimeout(timeout);pending=false;sync();return;}
      viewer=mountProjectViewer(scene,definition);
      if(!viewer || typeof viewer.setView!=='function')throw Error('Viewer is unavailable');
      viewer.setView(view);
      clearTimeout(timeout);mounted=true;pending=false;sceneError='';sync();
    }catch{
      if(!isCurrent())return;
      clearTimeout(timeout);viewer?.dispose?.();viewer=null;scene.replaceChildren();mounted=false;
      fail('3D-модель не загрузилась. Попробуйте ещё раз или откройте фотографию.');
    }
  }
  image.addEventListener('load',()=>{clearTimeout(photoTimer);photoStatus.hidden=true;});
  image.addEventListener('error',()=>{clearTimeout(photoTimer);photoFailed=true;image.hidden=true;photoStatus.hidden=false;photoStatus.textContent='Не удалось загрузить фотографию производителя.';sync();});
  close.addEventListener('click',()=>finish());
  dialog.addEventListener('close',()=>finish());
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left || event.clientY<r.top || event.clientX>r.right || event.clientY>r.bottom)finish();
  });
  modelMode.addEventListener('click',()=>setMode('model'));photoMode.addEventListener('click',()=>setMode('photo'));
  retry.addEventListener('click',load);
  viewButtons.forEach((btn,key)=>btn.addEventListener('click',()=>setView(key)));
  for(const [btn,amount] of [[rotateLeft,-.34],[rotateRight,.34]])btn.addEventListener('click',()=>{stopSpin();viewer?.rotate(amount);sync();});
  reset.addEventListener('click',()=>{stopSpin();viewer?.reset();sync();});
  auto.addEventListener('click',()=>{
    if(!viewer || auto.disabled)return;
    const next=!autoActive;autoActive=next;const actual=viewer.setAutoRotate(next);
    if(typeof actual==='boolean')autoActive=actual;
    sync();
  });
  scene.addEventListener('viewer-autochange',event=>{autoActive=Boolean(event.detail?.active);sync();});
  contact.addEventListener('click',handleContact);
  copyLink?.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText(shareURL.href);
      if(disposed)return;
      linkField.hidden=true;linkFeedback.textContent='Ссылка скопирована.';
    }catch{
      if(disposed)return;
      linkField.hidden=false;linkField.focus({preventScroll:true});linkField.select();
      linkFeedback.textContent='Ссылка выделена. Скопируйте её.';
    }
  });
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pageHide);reduced.addEventListener('change',motionChanged);
  openTour=finish;sync();
  try{dialog.showModal();}catch(error){finish(false);throw error;}
  close.focus({preventScroll:true});load();
  return {close:finish};
}
