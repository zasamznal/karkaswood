import { mountContact } from './contact.js';
import { mountFit } from './fit.js';
import { mountComparison } from './compare.js';
import { comparisonPrice } from './project-offers.js';
import { renderProjectGuide } from './project-guide.js';
import { mountFeaturedProject } from './featured-project.js';

import { mountCatalog } from './catalog.js';
import { mountMotion } from './motion.js';
import { applySeason } from './season.js';
import { getTourId } from './tour-registry.js';
import { openProjectTour } from './project-dialog.js';
import { getPreviewDraft, loadPublicSite } from './site-data.js';

const pageParameters = new URLSearchParams(location.search);
const seasonalPreview = pageParameters.get('season');
const requestedProject = pageParameters.get('project');
const requestedItem = pageParameters.get('item');
const requestedCategory = pageParameters.get('category');
mountMotion();
applySeason(document.documentElement.dataset.kwSeason);

function syncIdentity(settings) {
  const text = (selector, value) => {
    if (typeof value === 'string') document.querySelectorAll(selector).forEach(node => { node.textContent = value; });
  };
  text('.brand span', settings.brand);
  text('#hero-title', settings.heading);
  text('.hero-intro', settings.intro);
  text('[data-location]', settings.location);
  text('[data-location-short]', settings.location?.split(',')[0]);
  if (settings.brand && settings.heading) document.title = settings.brand + ' — ' + settings.heading;
  document.querySelectorAll('.brand').forEach(el => el.setAttribute('aria-label', (settings.brand || 'Мастерская') + ', в начало'));
  const channel = document.querySelector('[data-channel]');
  channel.hidden = !/^https:\/\/t\.me\/[A-Za-z0-9_]+$/.test(settings.channel);
  if (!channel.hidden) channel.href = settings.channel;
  const phone = document.querySelector('.visit-phone');
  phone.hidden = !/^\+[1-9]\d{6,14}$/.test(settings.phone);
  if (!phone.hidden) {
    phone.href = 'tel:' + settings.phone;
    phone.textContent = settings.phone.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 $1 $2-$3-$4');
  }
  document.querySelectorAll('a[data-contact]').forEach(el => {
    const telegram = /^https:\/\/t\.me\/[A-Za-z0-9_]+$/.test(settings.telegram);
    if (telegram) el.href = settings.telegram;
    else if (!phone.hidden) el.href = phone.href;
    else el.hidden = true;
  });
}


const menu = document.querySelector('.mast-nav');
const menuToggle = document.querySelector('.menu-toggle');
function setMenu(open) {
  menu.toggleAttribute('data-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  menuToggle.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
}
menuToggle.addEventListener('click', () => setMenu(!menu.hasAttribute('data-open')));
document.addEventListener('click', event => {
  if (menu.hasAttribute('data-open') && (!menuToggle.contains(event.target))) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.hasAttribute('data-open')) {
    setMenu(false);
    menuToggle.focus();
  }
});
matchMedia('(min-width:721px)').addEventListener('change', event => {
  if (event.matches) setMenu(false);
});

async function preparePage() {
  const draft = getPreviewDraft();
  const snapshot = draft || await loadPublicSite();
  document.querySelector('#preview-status').hidden = !draft;
  const {settings, items} = snapshot;
  syncIdentity(settings);
  applySeason(!draft && ['classic','newyear'].includes(seasonalPreview) ? seasonalPreview : settings.theme);
  const explicitSeason = ['classic','newyear'].includes(seasonalPreview);
  if (draft || explicitSeason) {
    document.querySelectorAll('.footer-legal a').forEach(link => {
      const target = new URL(link.href);
      if (draft) target.searchParams.set('preview','draft');
      if (explicitSeason) target.searchParams.set('season',seasonalPreview);
      link.href = target.href;
    });
  }
  if (explicitSeason) {
    const cabinetLink = document.querySelector('.footer-admin');
    const target = new URL(cabinetLink.href);
    target.searchParams.set('season', seasonalPreview);
    cabinetLink.href = target.href;
  }
  const showContact = mountContact(settings);
  const published = items.filter(item => item?.published !== false && item?.visible !== false && item?.id);
  const askAbout = (item, trigger) => showContact(trigger, item);
  const insideWidth = Number(settings.insideWidth) || 220;
  const barnCase = document.querySelector('#barn-case');
  const barn = published.find(item => item.id === 'barn-2-4-5' && getTourId(item) === 'barn-2-4-5');
  const featured = mountFeaturedProject(document.querySelector('#viewer'), published, {
    insideWidth, bedWidth:140, onContact:askAbout,
    onFeatureChanged(item) {
      document.querySelector('[data-viewer-nav]').hidden = !item;
      barnCase.hidden = !barn || item?.id !== barn.id;
      if (barnCase.hidden) barnCase.open = false;
    }
  });
  function openTour(item, trigger) {
    if (getTourId(item) === 'barn-2-4-5') {
      featured.selectProject(item.id);
      document.querySelector('#viewer').scrollIntoView({behavior:'instant'});
    } else {
      openProjectTour(item, trigger, askAbout);
    }
  }
  let catalogReady = false;
  const catalog = mountCatalog(document.querySelector('#product-catalog'), published, {
    onContact:askAbout, onTour:openTour,
    onCategoryChange(category) {
      featured.chooseCategory(category);
      if (!catalogReady) return;
      const address = new URL(location.href);
      if (category === 'all') address.searchParams.delete('category');
      else address.searchParams.set('category', category);
      address.searchParams.delete('project');
      address.searchParams.delete('item');
      history.replaceState(history.state, '', address);
    },
    onCompare:(item, trigger) => comparison.toggle(item, trigger)
  });
  if (requestedCategory) catalog.setFilter(requestedCategory);
  catalogReady = true;
  const comparison = mountComparison(document.querySelector('#comparison'), {
    items:published, formatPrice:comparisonPrice,
    onOpen:(item, trigger) => catalog.openItem(item, trigger), onContact:askAbout
  });
  comparison.subscribe(ids => catalog.setCompared(ids));
  renderProjectGuide(document.querySelector('#project-guide'), published, {
    onDetails(item, trigger, mode) {
      if (mode === 'tour') openTour(item, trigger);
      else catalog.openItem(item, trigger);
    },
    onContact:askAbout,
    onCategory(category) {
      if (!catalog.setFilter(category)) return;
      location.hash = 'catalog';
      document.querySelector('#catalog').scrollIntoView({behavior:'instant'});
      document.querySelector('#catalog-heading').focus({preventScroll:true});
    }
  });
  let initialized = false;
  mountFit(document.querySelector('#fit-calculator'), {insideWidth, onChange({bedWidth}) {
    if (initialized) document.documentElement.dataset.selectedBedWidth = String(bedWidth);
    featured.setBedWidth(bedWidth);
  }});
  initialized = true;
  function revealBarnSection() {
    if (!barn || !['#fit','#gallery','#about'].includes(location.hash)) return;
    featured.selectProject(barn.id);
    barnCase.open = true;
    document.querySelector(location.hash).scrollIntoView({behavior:'instant'});
  }
  window.addEventListener('hashchange', revealBarnSection);
  revealBarnSection();
  if (requestedItem && published.some(item => item.id === requestedItem)) {
    const heading = document.querySelector('#catalog-heading');
    document.querySelector('#catalog').scrollIntoView({behavior:'instant'});
    catalog.openItem(requestedItem, heading);
    return;
  }
  if (requestedProject) {
    const item = published.find(project => project.id === requestedProject);
    const matchedTour = getTourId(item);
    if (matchedTour) {
      if (matchedTour === 'barn-2-4-5') {
        openTour(item, document.querySelector('#catalog-heading'));
      } else {
        const heading = document.querySelector('#catalog-heading');
        document.querySelector('#catalog').scrollIntoView({behavior:'instant'});
        openProjectTour(item, heading, askAbout);
      }
      return;
    }
    if (item) {
      catalog.openItem(item, document.querySelector('#catalog-heading'));
      return;
    }
  }
  // A direct link to the tour can arrive while the catalogue above it is loading.
  const target = ['#catalog', '#project-guide', '#viewer', '#fit', '#gallery', '#about', '#visit'].includes(location.hash) && document.querySelector(location.hash);
  if (target && !target.hidden && window.scrollY < target.offsetTop + 15) target.scrollIntoView({behavior:'instant'});
}
preparePage().catch(() => {
  const area = document.querySelector('#product-catalog');
  area.innerHTML = '<p>Каталог временно не загрузился. <a href="https://t.me/karkaswoodstroy">Посмотреть работы в Telegram</a></p>';
  mountContact();
});

const gallery = document.querySelector('.photo-strip');
const photos = [...gallery.querySelectorAll('.photo')];
const previous = document.querySelector('[data-gallery-prev]');
const next = document.querySelector('[data-gallery-next]');
const reduced = matchMedia('(prefers-reduced-motion:reduce)');
function scrollPhotos(direction) {
  const step = photos[1].getBoundingClientRect().left - photos[0].getBoundingClientRect().left;
  gallery.scrollBy({left: step * direction, behavior:reduced.matches ? 'instant' : 'smooth'});
}
function updateGallery() {
  previous.disabled = gallery.scrollLeft < 2;
  next.disabled = gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 2;
}
previous.addEventListener('click', () => scrollPhotos(-1));
next.addEventListener('click', () => scrollPhotos(1));
gallery.addEventListener('scroll', updateGallery, {passive:true});
window.addEventListener('resize', updateGallery);
document.querySelector('#barn-case').addEventListener('toggle', () => requestAnimationFrame(updateGallery));
updateGallery();

const lightbox = document.querySelector('.lightbox');
let selected = 0;
function displayPhoto(index) {
  selected = (index + photos.length) % photos.length;
  const source = photos[selected].querySelector('img');
  const image = lightbox.querySelector('.lb-image');
  image.src = source.currentSrc || source.src;
  image.alt = source.alt;
  lightbox.querySelector('.lb-caption').textContent = photos[selected].querySelector('.photo-label').textContent.trim() + ' · ' + (selected + 1) + ' / ' + photos.length;
}
photos.forEach((photo, index) => photo.addEventListener('click', () => {
  displayPhoto(index);
  lightbox.showModal();
  lightbox.querySelector('.lb-close').focus({preventScroll:true});
}));
lightbox.querySelector('.lb-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => {
  if (event.target === lightbox) lightbox.close();
  const step = event.target.closest('[data-step]');
  if (step) displayPhoto(selected + Number(step.dataset.step));
});
lightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    displayPhoto(selected + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
