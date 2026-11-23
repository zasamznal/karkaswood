import { mountContact } from './contact.js';
import { mountFit } from './fit.js';

mountContact();

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

const model = document.querySelector('#model');
const tabs = [...document.querySelectorAll('[data-view]')];
let viewer;
let viewerTask;
let desiredView = 'outside';
let width = 140;
let calculatorReady = false;
mountFit(document.querySelector('#fit-calculator'), {
  onChange({bedWidth}) {
    width = bedWidth;
    if (calculatorReady) document.documentElement.dataset.selectedBedWidth = String(width);
    viewer?.setBedWidth(width);
  }
});
calculatorReady = true;

function loadModel() {
  if (!viewerTask) {
    viewerTask = import('./viewer.js').then(({mountViewer}) => {
      model.replaceChildren();
      viewer = mountViewer(model);
      viewer.setBedWidth(width);
      viewer.setView(desiredView);
      return viewer;
    }).catch(() => {
      model.innerHTML = '<p class="model-loading">Модель не загрузилась. <a href="#gallery">Посмотреть фотографии</a></p>';
      viewerTask = undefined;
    });
  }
  return viewerTask;
}
if (typeof IntersectionObserver === 'function') {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      loadModel();
      observer.disconnect();
    }
  }, {rootMargin:'260px'});
  observer.observe(model);
} else loadModel();

tabs.forEach(button => button.addEventListener('click', () => {
  desiredView = button.dataset.view;
  tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
  if (viewer) viewer.setView(desiredView);
  else loadModel();
}));
document.querySelectorAll('[data-turn]').forEach(button => button.addEventListener('click', async () => {
  const currentViewer = viewer || await loadModel();
  currentViewer?.rotate(Number(button.dataset.turn) * 0.35);
}));
document.querySelector('[data-reset]').addEventListener('click', async () => {
  const currentViewer = viewer || await loadModel();
  currentViewer?.reset();
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
