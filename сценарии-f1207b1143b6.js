/* кейс-бюро-погоды.js */
(() => {
 'use strict';
 document.querySelectorAll('[data-compare]').forEach(compare=>{
  const input=compare.querySelector('input[type="range"]');
  if(!input)return;
  const update=()=>{compare.style.setProperty('--split',input.value+'%');input.setAttribute('aria-valuetext',input.value==='0'?'Показано после':input.value==='100'?'Показано до':`До ${input.value}%, после ${100-Number(input.value)}%`);};
  input.addEventListener('input',update);update();
  compare.classList.add('weather-enhanced');compare.querySelector('label').hidden=false;
 });
 const video=document.querySelector('.weather-film video');
 if(video&&'IntersectionObserver' in window){
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)video.pause();},{threshold:0}).observe(video);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
 }
})();
