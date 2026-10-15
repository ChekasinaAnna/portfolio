// Прежнее вступление АЧ существует отдельно от композиции первого экрана.
(() => {
 const intro=document.querySelector('.intro'),initials=intro?.querySelector('.initials');
 const skip=intro?.querySelector('.skip-intro'),replay=document.querySelector('.replay');
 if(!intro||!initials||!skip||!replay)return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const content=[...document.body.children].filter(el=>el!==intro&&!['SCRIPT','STYLE'].includes(el.tagName));
 let animations=[],run=0,active=false,returnFocus=null,timer=0,keyboardInteraction=false;
 function finish({restoreFocus=false}={}){
  const wasActive=active;run++;active=false;clearTimeout(timer);
  animations.forEach(a=>a.cancel());animations=[];
  if(intro.contains(document.activeElement))document.activeElement.blur();
  intro.hidden=true;content.forEach(el=>el.inert=false);
  document.body.classList.remove('animating');replay.disabled=false;
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
  const token=run;active=true;intro.hidden=false;replay.disabled=true;
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
 replay.addEventListener('click',()=>play(true));
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
