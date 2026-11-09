const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-button');
menuButton.addEventListener('click', () => {
  const open = header.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
});
document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => {
  header.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const main = document.querySelector('main');
const deckScroll = document.querySelector('.deck-scroll');
const deckStage = document.querySelector('.deck-stage-root');
const scenes = [...deckStage.children];
const businessSection = document.querySelector('.business');
const businessCards = [...businessSection.querySelectorAll('.business-card')];
const businessCounter = businessSection.querySelector('.story-counter b');
const businessThemes = ['#ffffff', '#ffffff', '#ffffff'];
const historySection = document.querySelector('.history');
const historyItems = [...historySection.querySelectorAll('.timeline-item')];
const historyCounter = historySection.querySelector('.story-counter b');
const gallery = document.querySelector('.gallery');
const momentPhotos = [...gallery.querySelectorAll('.photo')];
let deckSteps = [];
let deckFrame = false;

function activate(items, index) {
  items.forEach((item, itemIndex) => item.classList.toggle('is-active', itemIndex === index));
}

function buildDeckSteps() {
  deckSteps = [
    { scene: document.querySelector('.hero') },
    ...businessCards.map((_, index) => ({ scene: businessSection, business: index })),
    ...momentPhotos.map((_, index) => ({ scene: document.querySelector('.moments'), moment: index })),
    ...historyItems.map((_, index) => ({ scene: historySection, history: index })),
    { scene: document.querySelector('.jumki') },
    { scene: document.querySelector('.experience') },
    { scene: document.querySelector('.contact') },
    { scene: document.querySelector('.map-chapter') }
  ];
}

const clamp01 = value => Math.min(1, Math.max(0, value));
const smoothstep = value => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};
const mixHex = (from, to, amount) => {
  const a = from.match(/\w\w/g).map(value => parseInt(value, 16));
  const b = to.match(/\w\w/g).map(value => parseInt(value, 16));
  const t = smoothstep(amount);
  return `rgb(${a.map((value, index) => Math.round(value + (b[index] - value) * t)).join(',')})`;
};

function setDeckPosition(position) {
  const roundedIndex = Math.min(deckSteps.length - 1, Math.max(0, Math.round(position)));
  const baseIndex = Math.min(deckSteps.length - 1, Math.floor(position));
  const nextIndex = Math.min(deckSteps.length - 1, baseIndex + 1);
  const local = position - baseIndex;
  const morphWeight = index => {
    if (index === baseIndex) return local < .5 ? 1 - smoothstep((local - .14) / .36) : 0;
    if (index === nextIndex) return local > .5 ? smoothstep((local - .5) / .36) : 0;
    return 0;
  };
  const sceneWeights = new Map();
  deckSteps.forEach((step, index) => {
    sceneWeights.set(step.scene, Math.max(sceneWeights.get(step.scene) || 0, morphWeight(index)));
  });
  if (deckSteps[baseIndex].scene === deckSteps[nextIndex].scene) {
    sceneWeights.set(deckSteps[baseIndex].scene, 1);
  }

  scenes.forEach(scene => {
    const weight = sceneWeights.get(scene) || 0;
    scene.classList.toggle('deck-active', weight > .001);
    scene.style.opacity = String(weight);
    scene.style.transform = `translate3d(0, ${(1 - weight) * 18}px, 0) scale(${.985 + weight * .015})`;
    scene.style.filter = `blur(${(1 - weight) * 7}px)`;
  });

  businessCards.forEach((card, index) => {
    const stepIndex = deckSteps.findIndex(step => step.business === index);
    const delta = position - stepIndex;
    const weight = morphWeight(stepIndex);
    card.classList.toggle('is-active', weight > .001);
    card.style.opacity = String(weight);
    card.style.transform = 'none';
    card.style.filter = 'none';
  });

  let historyDotFocus = 0;
  historyItems.forEach((item, index) => {
    const historyStartIndex = deckSteps.findIndex(step => step.history === 0);
    const stepIndex = historyStartIndex + index;
    const fade = morphWeight(stepIndex);
    item.classList.toggle('is-active', fade > .5);
    item.style.setProperty('--history-focus', String(fade));
    item.style.setProperty('--history-year-opacity', String(fade));
    item.style.setProperty('--history-detail-x', '0px');
    item.style.opacity = String(fade);
    item.style.transform = 'none';
    item.style.filter = 'none';
    historyDotFocus = Math.max(historyDotFocus, fade);
  });
  const activeHistoryDot = historySection.querySelector('.timeline-rail i:nth-child(2)');
  if (activeHistoryDot) {
    activeHistoryDot.style.backgroundColor = mixHex('#aeb4b7', '#72aeca', historyDotFocus);
    activeHistoryDot.style.transform = `translate(-50%,-50%) scale(${.68 + historyDotFocus * .32})`;
    activeHistoryDot.style.boxShadow = `0 0 0 ${historyDotFocus * 5}px rgba(114,174,202,${historyDotFocus * .12})`;
  }

  const momentStart = deckSteps.findIndex(step => step.moment === 0);
  const momentEnd = deckSteps.findIndex(step => step.moment === momentPhotos.length - 1);
  const momentPosition = clamp01((position - momentStart) / Math.max(1, momentEnd - momentStart));
  const galleryTravel = Math.max(0, gallery.scrollWidth - window.innerWidth + window.innerWidth * .08);
  gallery.style.setProperty('--gallery-x', `${-galleryTravel * momentPosition}px`);

  const businessPosition = clamp01((position - 1) / 2) * 2;
  const themeFrom = Math.min(1, Math.floor(businessPosition));
  const themeTo = Math.min(2, themeFrom + 1);
  businessSection.style.setProperty('--scene-bg', mixHex(businessThemes[themeFrom], businessThemes[themeTo], businessPosition - themeFrom));
  businessSection.style.color = '#111111';
  businessCounter.textContent = String(Math.min(3, Math.max(1, Math.round(businessPosition) + 1))).padStart(2, '0');

  const historyStart = deckSteps.findIndex(step => step.history === 0);
  const historyPosition = clamp01((position - historyStart) / 3) * 3;
  const historyIndex = Math.min(3, Math.max(0, Math.round(historyPosition)));
  historyCounter.textContent = String(historyIndex + 1).padStart(2, '0');
  historySection.dataset.historyIndex = String(historyIndex);

  const overallProgress = deckSteps.length > 1 ? position / (deckSteps.length - 1) : 0;
  document.documentElement.style.setProperty('--deck-progress', `${overallProgress * 100}%`);
  document.body.dataset.deckIndex = String(roundedIndex + 1).padStart(2, '0');
  const activeScene = deckSteps[roundedIndex].scene;
  const darkHeaderScenes = ['hero', 'moments', 'jumki', 'contact', 'map-chapter'];
  const headerTheme = darkHeaderScenes.some(className => activeScene.classList.contains(className)) ? 'dark' : 'light';
  header.dataset.theme = headerTheme;
}

function updateDeck() {
  if (!document.body.classList.contains('deck-mode')) return;
  const rect = deckScroll.getBoundingClientRect();
  const travel = Math.max(1, deckScroll.offsetHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, -rect.top / travel));
  const position = progress * (deckSteps.length - 1);
  setDeckPosition(position);
}

function requestDeckUpdate() {
  if (deckFrame) return;
  deckFrame = true;
  requestAnimationFrame(() => {
    updateDeck();
    deckFrame = false;
  });
}

function enableDeck() {
  if (window.innerWidth <= 640) return;
  buildDeckSteps();
  document.body.classList.add('deck-mode');
  scenes.forEach(scene => scene.classList.add('deck-scene'));
  const scrollLength = 1 + (deckSteps.length - 1) * 1.35;
  deckScroll.style.height = `${scrollLength * 100}vh`;
  activate(businessCards, 0);
  activate(historyItems, 0);
  updateDeck();
}

function disableDeck() {
  document.body.classList.remove('deck-mode');
  header.dataset.theme = 'light';
  scenes.forEach(scene => {
    scene.classList.remove('deck-scene', 'deck-active');
    scene.style.removeProperty('opacity');
    scene.style.removeProperty('transform');
    scene.style.removeProperty('filter');
  });
  [...businessCards, ...historyItems].forEach(item => {
    item.style.removeProperty('opacity');
    item.style.removeProperty('transform');
    item.style.removeProperty('filter');
    item.style.removeProperty('--history-focus');
    item.style.removeProperty('--history-year-opacity');
    item.style.removeProperty('--history-detail-x');
  });
  businessSection.classList.remove('scene-dark');
  gallery.style.transform = '';
  deckScroll.style.height = '';
}

function configureDeck() {
  if (window.innerWidth > 640) enableDeck();
  else disableDeck();
}

window.addEventListener('scroll', requestDeckUpdate, { passive: true });
window.addEventListener('resize', configureDeck);
configureDeck();

const deckTargets = { top: 0, business: 1, moments: 4, history: 8, contact: 14, location: 15 };
const jumpCurtain = document.createElement('div');
jumpCurtain.className = 'jump-curtain';
document.body.appendChild(jumpCurtain);
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  if (!document.body.classList.contains('deck-mode')) return;
  const target = link.getAttribute('href').slice(1) || 'top';
  if (deckTargets[target] === undefined) return;
  event.preventDefault();
  const targetProgress = deckTargets[target] / Math.max(1, deckSteps.length - 1);
  const targetTop = targetProgress * (deckScroll.offsetHeight - window.innerHeight);
  if (target === 'top') {
    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    updateDeck();
    document.documentElement.style.scrollBehavior = previousBehavior;
    return;
  }
  jumpCurtain.classList.add('is-visible');
  window.setTimeout(() => {
    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, targetTop);
    updateDeck();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = previousBehavior;
      jumpCurtain.classList.remove('is-visible');
    }));
  }, 180);
}));

document.getElementById('contactForm').addEventListener('submit', (event) => {
  event.preventDefault();
  event.currentTarget.querySelector('.form-status').textContent = '문의 폼 데모입니다. 실제 전송 기능을 연결해 주세요.';
});
document.getElementById('year').textContent = new Date().getFullYear();
document.querySelectorAll('.footer-year').forEach(year => { year.textContent = new Date().getFullYear(); });
