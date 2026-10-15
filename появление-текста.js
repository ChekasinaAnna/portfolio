(() => {
 'use strict';
 const motion = matchMedia('(prefers-reduced-motion: reduce)');
 const groups = [];
 let observer, initialized = false, heroPaused = false, resizeFrame = 0;
 const hero = document.querySelector('.page h1');

 function group(target, headings, descriptions = []) {
  if (!target) return;
  const record = {target, headings: headings.filter(Boolean).map(element => ({element,
   original: [...element.childNodes].map(node => node.cloneNode(true)),
   label: element.getAttribute('aria-label')})), descriptions: descriptions.filter(Boolean), started: false, timer: 0};
  groups.push(record);
  record.headings.forEach(({element}) => element.classList.add('reveal-preparing'));
 }
 group(hero, [hero], [document.querySelector('.page .description')]);
 document.querySelectorAll('.work-heading,.case-overview-heading').forEach(el => group(el, [el.querySelector('h2')], [el.querySelector('p')]));
 document.querySelectorAll('.project-caption').forEach(el => group(el, [el.querySelector('.project-name')], [el.querySelector('.project-type')]));
 const caseIntro = document.querySelector('.case-intro');
 if (caseIntro) group(caseIntro, [...caseIntro.querySelectorAll('h1,h2')], [...caseIntro.querySelectorAll('.case-about,.case-role p')]);
 document.querySelectorAll('.case-group>h3').forEach(el => group(el, [el]));

 // Измеряем копию вне наклонённых карточек: экранные координаты букв
 // в rotate/scale не определяют настоящую строку текста.
 function measurementCopy(element) {
  const copy = element.cloneNode(true), style = getComputedStyle(element);
  copy.removeAttribute('id'); copy.setAttribute('aria-hidden', 'true');
  for (const property of ['font-family','font-size','font-weight','font-style','font-stretch',
   'font-kerning','font-feature-settings','font-variation-settings','line-height',
   'letter-spacing','word-spacing','white-space','word-break','overflow-wrap',
   'text-transform','text-indent','text-align','direction']) {
   copy.style.setProperty(property, style.getPropertyValue(property));
  }
  Object.assign(copy.style, {position:'fixed', left:'0', top:'0', width:`${element.clientWidth}px`,
   maxWidth:'none', minWidth:'0', height:'auto', margin:'0', display:'block', visibility:'hidden',
   pointerEvents:'none', zIndex:'-1'});
  for (const node of [copy, ...copy.querySelectorAll('*')]) {
   node.removeAttribute('id');
   for (const property of ['transform','translate','rotate','scale','animation','transition']) node.style.setProperty(property, 'none', 'important');
  }
  document.body.append(copy);
  return copy;
 }
 // Range сохраняет кернинг, переносы <br> и адаптивные стили исходной разметки.
 function split(heading) {
  const {element, original, label} = heading;
  element.replaceChildren(...original.map(node => node.cloneNode(true)));
  element.classList.remove('reveal-heading');
  const accessibleText = label || element.innerText.replace(/\s+/g, ' ').trim();
  const measurement = measurementCopy(element);
  const walker = document.createTreeWalker(measurement, NodeFilter.SHOW_TEXT);
  const range = document.createRange(), rows = [];
  let node;
  try {
  while ((node = walker.nextNode())) {
   for (let offset = 0; offset < node.length;) {
    const character = String.fromCodePoint(node.data.codePointAt(offset));
    range.setStart(node, offset); range.setEnd(node, offset + character.length); offset += character.length;
    const rect = range.getBoundingClientRect();
    if (!rect.height) {
     // Пробел между flex-элементами не имеет прямоугольника, но разделяет слова.
     if (/\s/.test(character) && rows.length) rows[rows.length - 1].text += ' ';
     continue;
    }
    let row = rows.find(item => Math.abs(item.top - rect.top) < 2);
    if (!row) rows.push(row = {top: rect.top, text: ''});
    row.text += character;
   }
  }
  } finally {measurement.remove();}
  const lines = rows.map(row => row.text.trim()).filter(Boolean);
  if (!lines.length) return;
  element.setAttribute('aria-label', accessibleText);
  if (element.matches('.project-name')) element.parentElement.setAttribute('aria-label', accessibleText);
  element.replaceChildren(...lines.map((text, index) => {
   const mask = document.createElement('div'), line = document.createElement('span');
   mask.className = 'line reveal-line'; mask.setAttribute('aria-hidden', 'true');
   mask.style.setProperty('--line-index', index); line.textContent = text; mask.append(line); return mask;
  }));
  element.classList.add('reveal-heading');
 }
 function elements(record) {return [...record.headings.map(item => item.element), ...record.descriptions];}
 function settle(record) {elements(record).forEach(el => el.classList.add('is-settled'));}
 function reveal(record, immediate = false) {
  if (record.started) return;
  record.started = true;
  observer?.unobserve(record.target);
  elements(record).forEach(el => el.classList.add('is-revealed'));
  clearTimeout(record.timer);
  const lineCount = Math.max(1, ...record.headings.map(item => item.element.querySelectorAll('.reveal-line').length));
  if (immediate) settle(record);
  else record.timer = setTimeout(() => settle(record), 1250 + (lineCount - 1) * 150);
 }
 function observePending() {
  if (!initialized) return;
  groups.filter(record => !record.started).forEach(record => {
   if (record.target === hero && heroPaused) return;
   if (motion.matches || !observer) reveal(record, true);
   else {observer.unobserve(record.target); observer.observe(record.target);}
  });
 }
 function rebuild() {
  for (const record of groups) {
   // Изменение ширины не повторяет уже показанную анимацию.
   if (record.started) {clearTimeout(record.timer); settle(record);}
   record.headings.forEach(split);
  }
 }
 function failOpen() {
  observer?.disconnect();
  groups.forEach(record => {
   clearTimeout(record.timer);
   record.headings.forEach(({element, original, label}) => {
    element.replaceChildren(...original.map(node => node.cloneNode(true)));
    element.classList.remove('reveal-preparing','reveal-heading','reveal-ready');
    if (label === null) element.removeAttribute('aria-label'); else element.setAttribute('aria-label', label);
   });
   record.descriptions.forEach(el => el.classList.remove('reveal-description','reveal-ready'));
  });
 }
 // Вступление управляет только первым экраном. Остальные блоки — только viewport.
 window.textReveal = {
  pauseHero() {
   heroPaused = true;
   const record = groups.find(item => item.target === hero);
   if (!record) return;
   observer?.unobserve(hero); clearTimeout(record.timer); record.started = false;
   elements(record).forEach(el => el.classList.remove('is-revealed','is-settled','reveal-ready'));
   void hero.offsetHeight;
   elements(record).forEach(el => el.classList.add('reveal-ready'));
  },
  resumeHero() {heroPaused = false; observePending();}
 };
 // Страховка для недоступного шрифта: текст не остаётся спрятанным.
 Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2000))]).then(() => {
  try {
   rebuild();
   groups.forEach(record => {
    record.descriptions.forEach(el => el.classList.add('reveal-description'));
    record.headings.forEach(({element}) => element.classList.remove('reveal-preparing'));
   });
   void document.documentElement.offsetHeight;
   groups.forEach(record => elements(record).forEach(el => el.classList.add('reveal-ready')));
   if ('IntersectionObserver' in window) observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
     const record = groups.find(item => item.target === entry.target);
     if (entry.isIntersecting && entry.intersectionRatio >= .2 && !(entry.target === hero && heroPaused)) reveal(record);
    });
   }, {threshold: .2});
   initialized = true; observePending();
  } catch (error) {failOpen(); console.error('Не удалось подготовить появление текста', error);}
 });
 let width = innerWidth;
 addEventListener('resize', () => {
  if (width === innerWidth || !initialized) return;
  width = innerWidth; cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {try {rebuild();} catch {failOpen();}});
 });
 document.fonts.addEventListener('loadingdone', () => {if (initialized) {try {rebuild();} catch {failOpen();}}});
 motion.addEventListener('change', () => {
  if (motion.matches) groups.forEach(record => {reveal(record, true); clearTimeout(record.timer); settle(record);});
 });
 document.addEventListener('focusin', event => groups.forEach(record => {
  if (record.target.contains(event.target) || event.target.contains(record.target)) reveal(record, true);
 }));
})();
