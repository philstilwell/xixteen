const header = document.querySelector('.site-header');
if (header) {
  const toggle = header.querySelector('.site-menu-toggle');
  const nav = header.querySelector('.site-nav');
  const groups = [...header.querySelectorAll('.site-nav-group')];
  const mobile = window.matchMedia('(max-width: 960px)');
  const closeGroups = () => groups.forEach(group => { group.open = false; });
  function closeMenu() {
    header.removeAttribute('data-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    closeGroups();
  }
  toggle.hidden = false;
  header.classList.add('nav-ready');
  toggle.addEventListener('click', () => {
    const open = !header.hasAttribute('data-menu-open');
    header.toggleAttribute('data-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (!open) closeGroups();
  });
  for (const group of groups) group.addEventListener('toggle', () => {
    if (group.open) groups.forEach(other => { if (other !== group) other.open = false; });
  });
  nav.addEventListener('click', event => {
    const item = event.target.closest('a, button');
    if (!item) return;
    const groupSummary = item.closest('.site-nav-group')?.querySelector('summary');
    let destination;
    if (item.matches('a')) {
      const url = new URL(item.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.hash) {
        destination = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      }
    } else if (item.id === 'start-daily') destination = document.getElementById('workbench');
    closeMenu();
    // Keep keyboard focus out of a dropdown or phone panel that just closed.
    if (destination) {
      requestAnimationFrame(() => {
        if (!destination.hasAttribute('tabindex')) destination.setAttribute('tabindex', '-1');
        destination.focus({ preventScroll: true });
      });
    } else if (nav.contains(document.activeElement)) {
      if (mobile.matches) toggle.focus({ preventScroll: true });
      else groupSummary?.focus({ preventScroll: true });
    }
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) closeMenu();
  });
  document.addEventListener('focusin', event => {
    if (!header.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openGroup = groups.find(group => group.open);
    if (openGroup) {
      openGroup.open = false;
      openGroup.querySelector('summary').focus();
    } else if (header.hasAttribute('data-menu-open')) {
      closeMenu();
      toggle.focus();
    }
  });
  mobile.addEventListener('change', () => {
    const focusWasInside = nav.contains(document.activeElement);
    closeMenu();
    if (mobile.matches && focusWasInside) toggle.focus();
  });
  const measure = () => document.documentElement.style.setProperty('--site-header-height', `${header.getBoundingClientRect().height}px`);
  measure();
  new ResizeObserver(measure).observe(header);
}
