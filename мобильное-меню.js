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
