const page=document.querySelector('.page');
const motion=matchMedia('(prefers-reduced-motion: reduce)');const active=false;
function finish(){if(!document.body.classList.contains('animating'))window.textReveal?.resumeHero();requestMotion();}
const title=document.querySelector('h1'),cursor=document.querySelector('.cursor');
const projectSlots=[...document.querySelectorAll('.project-slot:not([data-featured])')];
const cursorExclusions=[...document.querySelectorAll('a,button,input,textarea,select,[role="button"]')];
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
let frame=0,lastTime=0,previousScroll=scrollY,smoothScroll=scrollY,stretch=1;
let pointerX=0,pointerY=0,cursorX=0,cursorY=0,pointerVisible=false,keyboardMode=false;
function requestMotion(){if(!frame&&!document.hidden&&!motion.matches)frame=requestAnimationFrame(updateMotion);}
function updateMotion(time){
 frame=0;const dt=lastTime?Math.min(time-lastTime,64):16.7;lastTime=time;
 const ease=1-Math.exp(-dt/75),current=Math.min(scrollY,innerHeight),delta=scrollY-previousScroll;
 previousScroll=scrollY;smoothScroll+=(current-smoothScroll)*ease;
 const targetStretch=1+Math.min(Math.abs(delta)/Math.max(dt,1)*.024,.028);
 stretch+=(targetStretch-stretch)*(1-Math.exp(-dt/110));
 if(!document.body.classList.contains('animating')){
  title.style.setProperty('--title-y',`${-smoothScroll*.18}px`);
  title.style.setProperty('--stretch',stretch.toFixed(4));
  page.style.setProperty('--actions-y',`${-smoothScroll*.055}px`);
  page.style.setProperty('--description-y',`${-smoothScroll*.11}px`);
  updateProjects();
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
addEventListener('scroll',requestMotion,{passive:true});addEventListener('resize',resetMotion);
addEventListener('blur',hideCursor);motion.addEventListener('change',resetMotion);finePointer.addEventListener('change',resetMotion);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;hideCursor();}else resetMotion();});
// Без JavaScript текст виден; вступление начинается после загрузки локального шрифта.
document.fonts.ready.then(()=>{finish()});addEventListener('pagehide',()=>{finish();cancelAnimationFrame(frame);frame=0;hideCursor()});
addEventListener('pageshow',event=>{if(event.persisted)resetMotion()});
