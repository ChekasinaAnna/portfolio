// Один фон для главной: цвет зависит от положения страницы, без догоняющей анимации.
(() => {
 const root=document.documentElement;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const sections=[
  ['.hero-3d',[233,234,238]],
  ['.work-section',[245,246,248]],
  ['#ai-projects',[228,232,250]],
  ['#experience',[233,234,238]],
  ['#contacts',[37,75,255]]
 ].map(([selector,color])=>({element:document.querySelector(selector),color,top:0}));
 if(sections.some(section=>!section.element))return;
 let frame=0,measureNeeded=true,maxScroll=0;
 const luminance=color=>color.map(value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 const dark=[22,23,26],muted=[89,93,101],white=[255,255,255],blue=[37,75,255];
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
    // На высоком экране короткий финал должен успеть стать полностью синим.
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
  const accent=contrast(light,luminance(blue))>=4.5?blue:ink;
  root.style.setProperty('--scroll-bg',rgb(color));
  root.style.setProperty('--scroll-ink',rgb(ink));
  root.style.setProperty('--scroll-muted',rgb(secondary));
  root.style.setProperty('--scroll-accent',rgb(accent));
  root.style.setProperty('--scroll-rule',ink===white?'#ffffff55':'#16171a30');
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
