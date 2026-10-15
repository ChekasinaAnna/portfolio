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
