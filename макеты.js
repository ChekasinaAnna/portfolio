// Без JavaScript все макеты видны целиком; ссылки на изображения работают всегда.
document.querySelectorAll('.case-layout').forEach(figure=>{
 const image=figure.querySelector('img');
 const button=figure.querySelector('.case-expand');
 if(!image||!button)return;
 let expanded=false;
 function update(){
  const limit=parseFloat(getComputedStyle(figure).getPropertyValue('--preview-height'));
  const fullHeight=image.getBoundingClientRect().height;
  const long=fullHeight>limit+2;
  button.hidden=!long;
  figure.classList.toggle('is-collapsed',long&&!expanded);
  button.setAttribute('aria-expanded',String(expanded||!long));
  button.textContent=expanded?'Свернуть страницу':'Показать страницу целиком';
 }
 button.addEventListener('click',()=>{
  expanded=!expanded;
  const top=figure.getBoundingClientRect().top;
  update();
  if(!expanded&&top<0)figure.scrollIntoView({block:'start',behavior:'instant'});
 });
 image.addEventListener('load',update);
 // Ширина может измениться при повороте телефона или изменении окна.
 const observer=new ResizeObserver(update);observer.observe(image);
 update();
});
