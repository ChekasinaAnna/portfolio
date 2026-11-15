/* появление-текста.js */
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

;
/* движение.js */
const page=document.querySelector('.page');
const motion=matchMedia('(prefers-reduced-motion: reduce)');const active=false;
function finish(){if(!document.body.classList.contains('animating'))window.textReveal?.resumeHero();requestMotion();}
const title=document.querySelector('h1'),cursor=document.querySelector('.cursor');
const projectSlots=[...document.querySelectorAll('.project-slot:not([data-featured])')];
// Розовые строки новых блоков используют тот же normal, что и ссылки сайта.
const cursorExclusions=[...document.querySelectorAll('a,button,input,textarea,select,[role="button"],.skills-grid article,.process-list li')];
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
let frame=0,lastTime=0,previousScroll=scrollY,smoothScroll=scrollY,stretch=1;
let projectsDirty=true;
let pointerX=0,pointerY=0,cursorX=0,cursorY=0,pointerVisible=false,keyboardMode=false;
function requestMotion(){if(!frame&&!document.hidden&&!motion.matches)frame=requestAnimationFrame(updateMotion);}
function updateMotion(time){
 frame=0;const dt=lastTime?Math.min(time-lastTime,64):16.7;lastTime=time;
 const ease=1-Math.exp(-dt/75),current=Math.min(scrollY,innerHeight),delta=scrollY-previousScroll;
 previousScroll=scrollY;smoothScroll+=(current-smoothScroll)*ease;
 const targetStretch=1+Math.min(Math.abs(delta)/Math.max(dt,1)*.024,.028);
 stretch+=(targetStretch-stretch)*(1-Math.exp(-dt/110));
 if(!document.body.classList.contains('animating')){
  if(!page.classList.contains('portrait-hero'))title.style.setProperty('--title-y',`${-smoothScroll*.18}px`);
  if(!page.classList.contains('portrait-hero'))title.style.setProperty('--stretch',stretch.toFixed(4));
  page.style.setProperty('--actions-y',`${-smoothScroll*.055}px`);
  page.style.setProperty('--description-y',`${-smoothScroll*.11}px`);
  if(projectsDirty){updateProjects();projectsDirty=false;}
 }
 if(pointerVisible&&finePointer.matches){
  cursorX+=(pointerX-cursorX)*ease;cursorY+=(pointerY-cursorY)*ease;
  cursor.style.transform=`translate3d(${cursorX}px,${cursorY}px,0) translate(-50%,-50%)`;
  updateCursorBlend();
 }
 if(Math.abs(current-smoothScroll)>.05||Math.abs(stretch-1)>.0001||(pointerVisible&&(Math.abs(pointerX-cursorX)>.1||Math.abs(pointerY-cursorY)>.1)))requestMotion();
}
function updateProjects(){
 const travel=Math.min(innerHeight*.5,420),mobile=innerWidth<=700;
 projectSlots.forEach((slot,index)=>{
  const top=slot.getBoundingClientRect().top;
  const progress=Math.max(0,Math.min(1,(innerHeight-top)/travel));
  const rest=1-progress,card=slot.firstElementChild;
  card.style.setProperty('--card-y',`${rest*(mobile?35:85)}px`);
  card.style.setProperty('--card-scale',String(1-rest*(mobile?.035:.10)));
  card.style.setProperty('--card-tilt',`${rest*(mobile?0:10)}deg`);
  card.style.setProperty('--card-roll',`${rest*(mobile?0:1.6)*(index%2?1:-1)}deg`);
  card.style.setProperty('--card-opacity',String(1-rest*.3));
 });
}
function updateCursorBlend(){
 // Учитываем и плавно догоняющий круг, чтобы у края синей кнопки не мелькал жёлтый.
 const overlaps=cursorExclusions.some(el=>{
  const rect=el.getBoundingClientRect();
  return rect.width>0&&rect.height>0&&cursorX+16.5>=rect.left&&cursorX-16.5<=rect.right&&cursorY+11.5>=rect.top&&cursorY-11.5<=rect.bottom;
 });
 cursor.classList.toggle('is-over-control',overlaps);
}
function hideCursor(){pointerVisible=false;cursor.classList.remove('is-visible','is-interactive','is-button','is-over-control');document.documentElement.classList.remove('custom-cursor');}
function resetMotion(){
 projectsDirty=true;
 cancelAnimationFrame(frame);frame=0;lastTime=0;previousScroll=scrollY;smoothScroll=scrollY;stretch=1;
 title.style.removeProperty('--title-y');title.style.removeProperty('--stretch');
 page.style.removeProperty('--actions-y');page.style.removeProperty('--description-y');hideCursor();
 if(motion.matches)projectSlots.forEach(slot=>slot.firstElementChild.removeAttribute('style'));
 if(!motion.matches)requestMotion();
}
function showCursor(event){
 if(motion.matches||!finePointer.matches||event.pointerType!=='mouse')return;
 if(keyboardMode){if(event.type!=='pointermove')return;keyboardMode=false;}
 pointerX=event.clientX;pointerY=event.clientY;
 if(!pointerVisible){cursorX=pointerX;cursorY=pointerY;cursor.style.transform=`translate3d(${cursorX}px,${cursorY}px,0) translate(-50%,-50%)`;}
 pointerVisible=true;cursor.classList.add('is-visible');document.documentElement.classList.add('custom-cursor');
 const target=event.target.closest('a,button,input,textarea,select,[role="button"]');
 cursor.classList.toggle('is-interactive',!!target);cursor.classList.toggle('is-button',!!target?.classList.contains('primary'));updateCursorBlend();requestMotion();
}
document.addEventListener('pointermove',showCursor,{passive:true});
document.addEventListener('pointerover',showCursor,{passive:true});
document.addEventListener('pointerout',event=>{if(!event.relatedTarget)hideCursor()});
document.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse')hideCursor()},{passive:true});
document.addEventListener('keydown',event=>{if(event.key==='Tab'){keyboardMode=true;hideCursor();}});
addEventListener('scroll',()=>{projectsDirty=true;requestMotion();},{passive:true});
addEventListener('portfolio:intro-end',()=>{projectsDirty=true;requestMotion();});addEventListener('resize',resetMotion);
addEventListener('blur',hideCursor);motion.addEventListener('change',resetMotion);finePointer.addEventListener('change',resetMotion);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;hideCursor();}else resetMotion();});
// Без JavaScript текст виден; вступление начинается после загрузки локального шрифта.
document.fonts.ready.then(()=>{finish()});addEventListener('pagehide',()=>{finish();cancelAnimationFrame(frame);frame=0;hideCursor()});
addEventListener('pageshow',event=>{if(event.persisted)resetMotion()});

;
/* цвета-при-прокрутке.js */
// Плавная смена общего фона при прокрутке: холодный белый, розовый и светло-серый.
// Первый экран сохраняет собственный фон; кейсы не подключают этот скрипт.
(() => {
 const root=document.documentElement;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const sections=[
  ['.hero-3d',[245,247,250]],
  ['.work-section',[240,241,244]],
  ['#ai-projects',[245,230,239]],
  ['#experience',[236,238,242]],
  ['#contacts',[245,226,237]]
 ].map(([selector,color])=>({element:document.querySelector(selector),color,top:0}));
 if(sections.some(section=>!section.element))return;
 let frame=0,measureNeeded=true,maxScroll=0;
 const luminance=color=>color.map(value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 const dark=[32,35,42],muted=[90,95,104],white=[255,255,255],accentColor=[197,29,107];
 const rgb=color=>`rgb(${color.join(',')})`;
 function render(){
  frame=0;
  if(measureNeeded){
   for(const section of sections)section.top=section.element.getBoundingClientRect().top+scrollY;
   maxScroll=Math.max(0,root.scrollHeight-innerHeight);
   measureNeeded=false;
  }
  // Переход начинается, когда раздел входит в нижнюю часть экрана,
  // и завершается до того, как заголовок поднимается к верхней трети.
  const span=innerHeight*.55;
  let color=sections[0].color;
  if(!reduced.matches){
   for(let i=1;i<sections.length;i++){
    // На высоком экране короткий финал должен успеть стать полностью окрашенным.
    const end=Math.min(sections[i].top-innerHeight*.275,maxScroll);
    const progress=Math.max(0,Math.min(1,(scrollY-(end-span))/span));
    const eased=progress*progress*(3-2*progress);
    color=color.map((v,j)=>Math.round(v+(sections[i].color[j]-v)*eased));
   }
  }
  // При reduced-motion сохраняем спокойную светлую основу без переливов.
  const light=luminance(color);
  const ink=contrast(light,luminance(dark))>=4.5?dark:contrast(light,1)>=4.5?white:[0,0,0];
  const secondary=contrast(light,luminance(muted))>=4.5?muted:ink;
  const accent=contrast(light,luminance(accentColor))>=4.5?accentColor:ink;
  root.style.setProperty('--scroll-bg',rgb(color));
  root.style.setProperty('--scroll-ink',rgb(ink));
  root.style.setProperty('--scroll-muted',rgb(secondary));
  root.style.setProperty('--scroll-accent',rgb(accent));
  root.style.setProperty('--scroll-rule',ink===white?'#ffffff55':'#20232a30');
  root.classList.add('scroll-palette');
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(render);}
 function measure(){measureNeeded=true;schedule();}
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',measure,{passive:true});
 addEventListener('pageshow',measure);
 reduced.addEventListener('change',schedule);
 new ResizeObserver(measure).observe(document.body);
 document.fonts.ready.then(measure);
 render();
})();

;
/* первый-кейс.js */
// Один переход от объёмной сцены к реальным интерфейсам. Положение следует
// прокрутке в обе стороны, без перехвата скролла и постоянного цикла кадров.
(() => {
 const hero=document.querySelector('.hero-stage')||document.querySelector('.portrait-scene'),scene=document.querySelector('.feature-scene');
 if(!hero||!scene)return;
 const phones=[...scene.querySelectorAll('.feature-phone')];
 const orbit=scene.querySelector('.feature-orbit');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=value=>Math.max(0,Math.min(1,value));
 let frame=0;
 function render(){
  frame=0;
  if(motion.matches){
   hero.style.removeProperty('--hero-departure');orbit.style.removeProperty('--orbit-scale');
   phones.forEach(phone=>{for(const key of ['--phone-x','--phone-y','--phone-angle'])phone.style.removeProperty(key);});
   return;
  }
  const departure=clamp(-hero.getBoundingClientRect().top/hero.offsetHeight);
  hero.style.setProperty('--hero-departure',String(1-departure*.055));
  const progress=clamp((innerHeight*.92-scene.getBoundingClientRect().top)/(innerHeight*.72));
  const rest=1-progress*progress*(3-2*progress),mobile=innerWidth<=700;
  const spread=scene.clientWidth*(mobile?.13:.12);
  const angles=mobile?[-14,0,14]:[-12,0,12];
  phones.forEach((phone,index)=>{
   const direction=1-index;
   phone.style.setProperty('--phone-x',`${direction*spread*rest}px`);
   phone.style.setProperty('--phone-y',`${rest*(index===1?80:145)}px`);
   phone.style.setProperty('--phone-angle',`${angles[index]*(1-rest*.8)}deg`);
  });
  orbit.style.setProperty('--orbit-scale',String(1-rest*.14));
 }
 function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(render);}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
 addEventListener('pageshow',schedule);motion.addEventListener('change',schedule);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();});
 new ResizeObserver(schedule).observe(document.body);
 document.fonts.ready.then(schedule);schedule();
})();

;
/* второй-кейс.js */
// Экраны расходятся при прокрутке. При остановке нет фонового цикла кадров.
(() => {
 const scene=document.querySelector('.youth-scene');if(!scene)return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
 function render(){
  frame=0;
  const progress=motion.matches?1:Math.max(0,Math.min(1,(innerHeight*.92-scene.getBoundingClientRect().top)/(innerHeight*.72)));
  scene.style.setProperty('--youth-rest',String(1-progress*progress*(3-2*progress)));
 }
 function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(render);}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
 addEventListener('pageshow',schedule);motion.addEventListener('change',schedule);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();});
 new ResizeObserver(schedule).observe(document.body);document.fonts.ready.then(schedule);schedule();
})();

;
/* мобильное-меню.js */
(() => {
 const header = document.querySelector('.hero-3d .header');
 const toggle = header?.querySelector('.nav-toggle');
 const nav = header?.querySelector('#main-navigation');
 if (!header || !toggle || !nav) return;
 const narrow = matchMedia('(max-width:360px)');
 const label = toggle.querySelector('.nav-toggle-label');
 function setOpen(open, restoreFocus = false) {
  const expanded = narrow.matches && open;
  header.classList.toggle('is-menu-open', expanded);
  toggle.setAttribute('aria-expanded', String(expanded));
  label.textContent = expanded ? 'Закрыть' : 'Меню';
  if (restoreFocus && narrow.matches) toggle.focus({preventScroll:true});
 }
 header.classList.add('has-mobile-menu');
 toggle.hidden = false;
 toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
 nav.addEventListener('click', event => {
  if (event.target.closest('a') && narrow.matches) setOpen(false, true);
 });
 document.addEventListener('pointerdown', event => {
  if (!header.contains(event.target)) setOpen(false);
 });
 document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
   event.preventDefault();
   setOpen(false, true);
  }
 });
 narrow.addEventListener('change', () => {
  // Не оставляем фокус на скрытой ссылке или кнопке после смены ширины.
  const active = document.activeElement;
  setOpen(false);
  if (narrow.matches && nav.contains(active)) toggle.focus({preventScroll:true});
  else if (!narrow.matches && active === toggle) nav.querySelector('a')?.focus({preventScroll:true});
 });
})();

;
/* навыки-и-процесс.js */
(() => {
 'use strict';
 const stage=document.querySelector('.skills-stage');
 const cards=[...document.querySelectorAll('#skills .skills-grid article')];
 const section=document.querySelector('#process');
 const list=section?.querySelector('.process-list');
 const steps=[...(list?.children||[])];
 if(!stage||!list||!steps.length)return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const duration=4400;
 let frame=0,stageVisible=false,lineVisible=false,dirty=true;
 let elapsed=0,lastTime=0,playing=false,started=false;
 let revealObserver;
 const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
 const mix=(a,b,t)=>a+(b-a)*t;
 function queue(){if(!frame&&!motion.matches&&!document.hidden)frame=requestAnimationFrame(render);}
 function poseCards(){
  dirty=false;
  if(innerWidth<=1100||motion.matches)return;
  const rect=stage.getBoundingClientRect();
  const progress=clamp((innerHeight-rect.top)/(innerHeight+rect.height));
  const fromY=[0,100,155,215],middleY=[24,82,34,104],toY=[82,30,90,18];
  const fromAngle=[-7,5,-5,7],toAngle=[-2,3,-2,2];
  cards.forEach((card,index)=>{
   const y=progress<.5?mix(fromY[index],middleY[index],progress*2):mix(middleY[index],toY[index],(progress-.5)*2);
   card.style.setProperty('--card-y',y.toFixed(2)+'px');
   card.style.setProperty('--card-angle',mix(fromAngle[index],toAngle[index],progress).toFixed(2)+'deg');
  });
 }
 function paintLine(progress){
  steps.forEach((step,index)=>{
   step.style.setProperty('--segment-fill',clamp(progress-index).toFixed(4));
   step.classList.toggle('is-lit',progress>=index);
  });
 }
 function render(time){
  frame=0;
  if(dirty&&stageVisible)poseCards();
  if(playing&&lineVisible){
   if(lastTime)elapsed+=Math.min(time-lastTime,100);
   lastTime=time;
   paintLine(clamp(elapsed/duration)*steps.length);
   if(elapsed>=duration){playing=false;list.classList.remove('is-playing');}
   else queue();
  }
 }
 function start(){
  if(motion.matches||started)return;
  started=true;playing=true;lastTime=0;
  list.classList.add('is-playing');paintLine(0);queue();
 }
 function reset(){
  elapsed=0;lastTime=0;started=false;playing=false;
  list.classList.remove('is-playing');paintLine(-1);
 }
 function configureReveal(){
  revealObserver?.disconnect();
  if(motion.matches||!('IntersectionObserver' in window)){
   stage.classList.remove('cards-reveal-ready');
   cards.forEach(card=>card.classList.add('is-card-visible'));return;
  }
  revealObserver=new IntersectionObserver(entries=>{
   for(const entry of entries){
    if(!entry.isIntersecting||entry.intersectionRatio<.12)continue;
    entry.target.classList.add('is-card-visible');revealObserver.unobserve(entry.target);
   }
  },{threshold:.12,rootMargin:'0px 0px -40px 0px'});
  stage.classList.add('cards-reveal-ready');
  cards.forEach(card=>{if(!card.classList.contains('is-card-visible'))revealObserver.observe(card);});
 }
 function configure(){
  cancelAnimationFrame(frame);frame=0;lastTime=0;
  configureReveal();
  if(motion.matches){
   playing=false;section.classList.remove('timeline-ready');
   cards.forEach(card=>{card.style.removeProperty('--card-y');card.style.removeProperty('--card-angle');});
   paintLine(steps.length);return;
  }
  section.classList.add('timeline-ready');reset();dirty=true;
  if(lineVisible)start();queue();
 }
 if(!('IntersectionObserver' in window)){
  // Без наблюдателя остаётся статичная, полностью читаемая композиция.
  paintLine(steps.length);return;
 }
 new IntersectionObserver(entries=>{
  for(const entry of entries){stageVisible=entry.isIntersecting;if(stageVisible){dirty=true;queue();}}
 },{rootMargin:'120px 0px'}).observe(stage);
 new IntersectionObserver(entries=>{
  for(const entry of entries){
   lineVisible=entry.isIntersecting;
   if(motion.matches)continue;
   if(lineVisible){start();lastTime=0;queue();}
   else{lastTime=0;if(entry.boundingClientRect.top>=innerHeight)reset();}
  }
 },{threshold:.2}).observe(list);
 addEventListener('scroll',()=>{dirty=true;queue();},{passive:true});
 addEventListener('resize',()=>{dirty=true;queue();});
 document.addEventListener('visibilitychange',()=>{
  lastTime=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{dirty=true;queue();}
 });
 motion.addEventListener('change',configure);
 configure();
})();

;
/* заставка.js */
// Прежнее вступление АЧ существует отдельно от композиции первого экрана.
(() => {
 const intro=document.querySelector('.intro'),initials=intro?.querySelector('.initials');
 const skip=intro?.querySelector('.skip-intro'),replay=document.querySelector('.replay');
 if(!intro||!initials||!skip)return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const content=[...document.body.children].filter(el=>el!==intro&&!['SCRIPT','STYLE'].includes(el.tagName));
 let animations=[],run=0,active=false,returnFocus=null,timer=0,keyboardInteraction=false;
 function finish({restoreFocus=false}={}){
  const wasActive=active;run++;active=false;clearTimeout(timer);
  animations.forEach(a=>a.cancel());animations=[];
  if(intro.contains(document.activeElement))document.activeElement.blur();
  intro.hidden=true;content.forEach(el=>el.inert=false);
  document.body.classList.remove('animating');if(replay)replay.disabled=false;
  window.textReveal?.resumeHero();
  if(wasActive&&restoreFocus&&(returnFocus||keyboardInteraction))(returnFocus||document.querySelector('.identity')).focus({preventScroll:true});
  if(wasActive)dispatchEvent(new Event('portfolio:intro-end'));
 }
 function animate(el,frames,options){
  const animation=el.animate(frames,{fill:'both',...options});animations.push(animation);return animation;
 }
 async function play(manual=false){
  finish();if(motion.matches)return;
  returnFocus=manual?replay:null;keyboardInteraction=false;
  if(manual)scrollTo({top:0,behavior:'instant'});
  const token=run;active=true;intro.hidden=false;if(replay)replay.disabled=true;
  content.forEach(el=>el.inert=true);document.body.classList.add('animating');
  dispatchEvent(new Event('portfolio:intro-start'));
  window.textReveal?.pauseHero();skip.focus({preventScroll:true});
  // Страховка: даже при сбое анимации страница освобождается.
  timer=setTimeout(()=>finish({restoreFocus:true}),4500);
  try{
   const scale=Math.max(innerWidth/110,innerHeight/80)*1.65;
   animate(initials,[{transform:'translate(-50%,-50%) scale(.4)',opacity:0,offset:0},{transform:'translate(-50%,-50%) scale(.48)',opacity:1,offset:.23},{transform:`translate(-50%,-50%) scale(${scale})`,opacity:1,offset:1}],{duration:1720,easing:'cubic-bezier(.72,0,.2,1)'});
   const exit=animate(intro,[{transform:'translateY(0)'},{transform:'translateY(-105%)'}],{duration:780,delay:1680,easing:'cubic-bezier(.76,0,.24,1)'});
   await exit.finished;
   if(token===run)finish({restoreFocus:true});
  }catch{if(token===run)finish({restoreFocus:true});}
 }
 skip.addEventListener('click',()=>finish({restoreFocus:true}));
 replay?.addEventListener('click',()=>play(true));
 document.addEventListener('keydown',event=>{
  if(!active)return;
  keyboardInteraction=true;
  if(event.key==='Escape'){event.preventDefault();finish({restoreFocus:true});}
  if(event.key==='Tab'){event.preventDefault();skip.focus();}
 });
 motion.addEventListener('change',()=>{if(motion.matches)finish({restoreFocus:true});});
 addEventListener('pagehide',()=>finish());
 addEventListener('pageshow',event=>{if(event.persisted)finish();});
 // Не задерживаем вход по якорю или восстановление прокрутки браузером.
 if(!location.hash&&scrollY<10)play();
})();

;
/* размер-первого-экрана.js */
// Масштаб согласованного макета. Сценарий перехода отключён.
(() => {
 const layout=document.querySelector('.hero-layout');
 if(!layout)return;
 const measure=()=>layout.style.setProperty('--hero-scale',String(Math.min(innerWidth/1440,innerHeight/900)));
 addEventListener('resize',measure,{passive:true});measure();
})();
