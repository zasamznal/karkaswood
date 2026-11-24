import { comparisonPrice, getOffer } from './project-offers.js';

const MAX_SELECTED = 3;
const categories = new Map([['bath','Баня'],['utility','Хозблок'],['cabin','Бытовка'],['house','Дом']]);
const areaFormat = new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 2});
const sheet = new URL('./compare.css', import.meta.url).href;
let nextInstance = 0;

// Only these published projects have a documented rectangular footprint without a terrace.
// Match the original listing and dimensions before showing the derived footprint area.
const rectangles = {
  'barn-2-4-5': ['105',2.4,5],
  'scandinavia-3-5': ['342',3,5],
  'barn-compact': ['89',2.4,3],
  'workshop-3-4': ['359',3,4],
  'bath-panoramic': ['382',2.5,8],
  'provence-garden': ['282',2.4,4.8],
  'loft-garden': ['333',2,4],
  'barn-maxi': ['323',2.4,5],
};

function area(item) {
  if (!Object.hasOwn(rectangles,item.id)) return '';
  const [post, width, length] = rectangles[item.id];
  const source = String(item.source || '').replace(/[/?#]+$/, '');
  if (source !== 'https://t.me/karkaswoodstroy/'+post || /террас|дровник|г-образн/i.test(item.name+' '+item.summary)) return '';
  const pair = /^(\d+(?:[.,]\d+)?)\s*[×хx*]\s*(\d+(?:[.,]\d+)?)\s*м\.?$/iu.exec(String(item.dimensions || '').trim());
  if (!pair) return '';
  const [a,b] = pair.slice(1).map(value => Number(value.replace(',','.')));
  return (a===width && b===length || a===length && b===width) ? areaFormat.format(a*b)+' м²' : '';
}

function safeURL(value, photo=false) {
  if (typeof value !== 'string' || !value || /[\x00-\x1F\\]/.test(value)) return '';
  if (photo && value.length<=250000 && /^data:image\/(?:jpeg|webp|png);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  try {
    const url = new URL(value,photo?document.baseURI:undefined);
    if (url.username || url.password) return '';
    if (url.protocol === 'https:' || photo && url.origin===location.origin && url.protocol==='http:') return url.href;
  } catch {}
  return '';
}

function node(tag, cls, text) {
  const el=document.createElement(tag);
  if (cls) el.className=cls;
  if (text) el.textContent=text;
  return el;
}

function button(cls,text,label) {
  const el=node('button',cls,text);
  el.type='button';
  if (label) el.setAttribute('aria-label',label);
  return el;
}

function installStyle() {
  if ([...document.querySelectorAll('link[rel~="stylesheet"]')].some(link=>link.href===sheet)) return;
  const link=node('link'); link.rel='stylesheet';link.href=sheet;document.head.append(link);
}

export function mountComparison(container, { items=[], formatPrice=comparisonPrice, onOpen, onContact, onChange }={}) {
  installStyle();
  const key='kwcompare-'+(++nextInstance);
  const usable=items.filter(item=>item && typeof item.id==='string' && item.id && item.name?.trim() && item.published!==false && item.visible!==false);
  const byId=new Map(usable.map(item=>[item.id,item]));
  const listeners=new Set();
  let selected=[],opener=null,lastCard=null,photoTrigger=null,disposed=false;
  const root=node('div','kwcmp-root');
  const announcement=node('p','kwcmp-sr'); announcement.setAttribute('role','status'); announcement.setAttribute('aria-atomic','true');
  const dock=button('kwcmp-dock','');
  dock.hidden=true; dock.setAttribute('aria-haspopup','dialog'); dock.setAttribute('aria-controls',key);
  const dockPhotos=node('span','kwcmp-dock-photos');dockPhotos.setAttribute('aria-hidden','true');
  const dockText=node('span','kwcmp-dock-title');
  const chevron=node('span','kwcmp-chevron','↗');chevron.setAttribute('aria-hidden','true');
  dock.append(dockPhotos,dockText,chevron);
  const notice=node('p','kwcmp-notice');
  notice.setAttribute('aria-hidden','true');notice.hidden=true;
  let noticeTimer=0;
  const dialog=node('dialog','kwcmp-dialog');dialog.id=key;dialog.setAttribute('aria-labelledby',key+'-title');
  const head=node('header','kwcmp-head');
  const title=node('h2','','Сравнение проектов');title.id=key+'-title';
  const close=button('kwcmp-close','×','Закрыть сравнение');close.autofocus=true;
  head.append(title,close);
  const selection=node('div','kwcmp-selection');
  const count=node('p','kwcmp-count');
  const pickerLabel=node('label','kwcmp-picker');
  const picker=node('select');picker.setAttribute('aria-label','Добавить проект в сравнение');
  pickerLabel.append(picker);
  selection.append(count,pickerLabel);
  const hint=node('p','kwcmp-scroll-hint','Сдвиньте таблицу вбок, чтобы увидеть третий проект.');
  const tableWrap=node('div','kwcmp-table-wrap');tableWrap.tabIndex=0;tableWrap.setAttribute('role','region');tableWrap.setAttribute('aria-label','Сравнительные характеристики');
  const footer=node('footer','kwcmp-footer');
  const request=button('kwcmp-request','Запросить расчёт по выбранным проектам');
  footer.append(request);
  const dialogStatus=node('p','kwcmp-sr');dialogStatus.setAttribute('role','status');dialogStatus.setAttribute('aria-atomic','true');
  dialog.append(head,selection,hint,tableWrap,footer,dialogStatus);

  const photoDialog=node('dialog','kwcmp-photo-dialog');photoDialog.setAttribute('aria-labelledby',key+'-photo-title');
  const photoHead=node('header','kwcmp-head');
  const photoTitle=node('h2');photoTitle.id=key+'-photo-title';
  const photoClose=button('kwcmp-close','×','Закрыть фотографию');
  photoHead.append(photoTitle,photoClose);
  const photoBox=node('div','kwcmp-photo-box');
  photoDialog.append(photoHead,photoBox);
  root.append(announcement,dock,notice,dialog,photoDialog);
  container.replaceChildren(root);

  function announce(text,visible=false) {
    announcement.textContent=dialog.open?'':text;
    dialogStatus.textContent=dialog.open?text:'';
    clearTimeout(noticeTimer);notice.hidden=true;
    if(visible && !dialog.open) {
      notice.textContent=text;notice.hidden=false;
      noticeTimer=window.setTimeout(()=>{notice.hidden=true;},4800);
    }
  }
  function image(src,alt='') {
    const el=node('img');el.alt=alt;el.decoding='async';el.referrerPolicy='no-referrer';el.src=src;
    return el;
  }
  function showPhoto(item,src,trigger) {
    const pic=image(src,item.name);
    pic.addEventListener('error',()=>{photoBox.replaceChildren(node('p','','Фотография сейчас недоступна.'));},{once:true});
    photoTrigger=trigger;photoTitle.textContent=item.name;
    photoBox.replaceChildren(pic);
    photoDialog.showModal();
    photoClose.focus({preventScroll:true});
  }
  function projectLink(item,callback,cls,label) {
    const action=button(cls,label,label+' — '+item.name);
    action.addEventListener('click',()=>{
      const returnTo=dock.hidden ? opener : dock;
      closeDialog();
      callback(item,returnTo);
    });
    return action;
  }
  function headerCell(item) {
    const cell=node('th','kwcmp-model');cell.scope='col';
    const photo=safeURL(item.photo,true);
    const controls=node('div','kwcmp-thumb-row');
    if(photo) {
      const view=button('kwcmp-thumb','','Открыть фото — '+item.name);
      const pic=image(photo);
      pic.addEventListener('error',()=>{view.hidden=true;},{once:true});
      view.append(pic);view.addEventListener('click',()=>showPhoto(item,photo,view));controls.append(view);
    }
    const remove=button('kwcmp-remove','×','Убрать из сравнения — '+item.name);remove.dataset.kwcmpRemove=item.id;
    remove.addEventListener('click',()=>{
      const index=selected.indexOf(item.id);
      toggle(item);
      const next=tableWrap.querySelectorAll('.kwcmp-remove');
      (next[Math.min(index,next.length-1)] || picker).focus({preventScroll:true});
    });
    controls.append(remove);
    cell.append(controls,node('span','kwcmp-project-name',item.name));
    return cell;
  }
  function renderTable() {
    const models=selected.map(id=>byId.get(id));
    const offers=models.map(item=>getOffer(item));
    tableWrap.replaceChildren();
    tableWrap.hidden=!models.length;
    hint.hidden=models.length<3;
    footer.hidden=models.length<2 || typeof onContact!=='function';
    if(!models.length) return;
    const table=node('table','kwcmp-table');
    table.dataset.columns=String(models.length);
    table.style.setProperty('--kwcmp-cols',models.length);
    const thead=node('thead'),headRow=node('tr');
    const corner=node('td','kwcmp-corner');corner.setAttribute('aria-hidden','true');
    headRow.append(corner,...models.map(headerCell));thead.append(headRow);
    const body=node('tbody');
    function row(label,values,renderCell=(value,cell)=>{cell.textContent=value||'—';}) {
      const tr=node('tr'),heading=node('th','kwcmp-row-label');heading.scope='row';heading.append(node('span','',label));tr.append(heading);
      values.forEach((value,i)=>{const td=node('td');renderCell(value,td,models[i]);tr.append(td);});
      body.append(tr);
    }
    row('Тип',models.map(item=>categories.get(item.category)));
    row('Габариты',models.map(item=>item.dimensions));
    const areas=models.map(area);
    if (areas.some(Boolean)) row('Площадь по наружным габаритам',areas);
    row('Цена',models.map(item=>typeof formatPrice==='function' ? formatPrice(item) : ''),(text,cell)=>{
      cell.className='kwcmp-price';cell.textContent=typeof text==='string' && text.trim() ? text.trim() : 'По запросу';
    });
    const notes=offers.map(offer=>offer?.currentNote);
    if(notes.some(Boolean)) row('Комментарий мастерской',notes);
    row('Особенности',models.map(item=>item.summary));
    function listRow(label,values) {
      if(!values.some(values=>values?.length)) return;
      row(label,values,(arr,cell)=>{
        if(!Array.isArray(arr) || !arr.length) {cell.textContent='—';return;}
        const ul=node('ul','kwcmp-list');
        for(const entry of arr) if(typeof entry==='string' && entry.trim()) ul.append(node('li','',entry));
        cell.append(ul);
      });
    }
    listRow('Комплектация по проекту',offers.map(offer=>offer?.included));
    listRow('Что уточнить',offers.map(offer=>offer?.clarify));
    row('Подробнее',models,(item,cell)=>{
      const actions=node('div','kwcmp-actions');
      if(typeof onOpen==='function') actions.append(projectLink(item,onOpen,'kwcmp-action','Карточка'));
      const source=safeURL(item.source);
      if(source) {
        const a=node('a','kwcmp-source','Публикация');a.href=source;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','Публикация мастерской — '+item.name);actions.append(a);
      }
      if(typeof onContact==='function') actions.append(projectLink(item,onContact,'kwcmp-action kwcmp-contact','Обсудить'));
      cell.append(actions);
    });
    table.append(thead,body);tableWrap.append(table);
  }
  function render() {
    dock.hidden=!selected.length;
    dockPhotos.replaceChildren();
    for(const id of selected) {
      const src=safeURL(byId.get(id).photo,true);
      if(src) {
        const pic=image(src);pic.addEventListener('error',()=>pic.remove(),{once:true});dockPhotos.append(pic);
      }
    }
    dockText.textContent='Сравнить · '+selected.length;
    dock.setAttribute('aria-label','Открыть сравнение. Выбрано проектов — '+selected.length);
    if(dialog.open) {
      count.textContent=selected.length ? 'Выбрано '+selected.length+' из '+MAX_SELECTED : 'Выберите проекты для сравнения';
      const rest=usable.filter(item=>!selected.includes(item.id));
      pickerLabel.hidden=selected.length>=MAX_SELECTED || !rest.length;
      picker.replaceChildren(new Option('Добавить проект…',''));
      for(const item of rest) picker.add(new Option(item.name,item.id));
      renderTable();
    }
  }
  function changed() {
    render();
    if(typeof onChange==='function') onChange([...selected]);
    for(const listener of listeners) listener([...selected]);
  }
  function toggle(value,trigger) {
    if(disposed) return false;
    const id=typeof value==='string'?value:value?.id;
    if(!byId.has(id)) return false;
    const item=byId.get(id),present=selected.includes(id);
    if(!present && selected.length>=MAX_SELECTED) {
      announce('Уже выбрано три проекта. Откройте сравнение и уберите один из них.',true);
      return false;
    }
    if(trigger instanceof HTMLElement && !dialog.contains(trigger)) lastCard=trigger;
    selected=present?selected.filter(key=>key!==id):[...selected,id];
    changed();
    announce((present?'Убрали из сравнения «':'Добавили в сравнение «')+item.name+'».');
    return !present;
  }
  function open(trigger) {
    if(disposed || dialog.open) return;
    opener=trigger instanceof HTMLElement?trigger:document.activeElement;
    dialog.showModal();
    render();
    close.focus({preventScroll:true});
  }
  function closeDialog() {
    if(photoDialog.open) photoDialog.close();
    if(dialog.open) dialog.close();
    if(opener?.isConnected && !opener.hidden && opener.getClientRects().length) opener.focus({preventScroll:true});
    else if(!dock.hidden) dock.focus({preventScroll:true});
    else if(lastCard?.isConnected) lastCard.focus({preventScroll:true});
  }
  function closePhoto() {
    if(photoDialog.open) photoDialog.close();
    if(dialog.open && photoTrigger?.isConnected) photoTrigger.focus({preventScroll:true});
  }
  function backdrop(element, closeFn) {
    element.addEventListener('cancel',event=>{event.preventDefault();closeFn();});
    element.addEventListener('click',event=>{
      if(event.target!==element) return;
      const r=element.getBoundingClientRect();
      if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) closeFn();
    });
  }
  dock.addEventListener('click',()=>open(dock));close.addEventListener('click',closeDialog);
  request.addEventListener('click',()=>{
    if(selected.length<2 || typeof onContact!=='function') return;
    const models=selected.map(id=>byId.get(id));
    closeDialog();onContact(models,dock);
  });
  picker.addEventListener('change',()=>{
    const id=picker.value;
    if(id && toggle(id)) {
      if(pickerLabel.hidden) close.focus({preventScroll:true});
      else picker.focus({preventScroll:true});
    }
  });
  photoClose.addEventListener('click',closePhoto);backdrop(photoDialog,closePhoto);backdrop(dialog,closeDialog);
  return {
    toggle,open,
    setSelected(ids) {
      if(disposed) return;
      const next=[...new Set(Array.isArray(ids)?ids:[])].filter(id=>byId.has(id)).slice(0,MAX_SELECTED);
      if(next.length===selected.length && next.every((id,i)=>id===selected[i])) return;
      selected=next;changed();
    },
    getSelected() {return [...selected];},
    subscribe(fn) {
      if(disposed || typeof fn!=='function') return ()=>{};
      listeners.add(fn);fn([...selected]);return ()=>listeners.delete(fn);
    },
    destroy() {
      disposed=true;clearTimeout(noticeTimer);listeners.clear();closeDialog();root.remove();
    },
  };
}
