// Один переход от объёмной сцены к реальным интерфейсам. Положение следует
// прокрутке в обе стороны, без перехвата скролла и постоянного цикла кадров.
(() => {
 const hero=document.querySelector('.hero-stage'),scene=document.querySelector('.feature-scene');
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
