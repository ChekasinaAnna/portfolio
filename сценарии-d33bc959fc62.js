/* кейс-а-давай.js */
(() => {
 const video=document.querySelector('.walk-film video');
 if(!video)return;
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)video.pause();},{threshold:0}).observe(video);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
})();
