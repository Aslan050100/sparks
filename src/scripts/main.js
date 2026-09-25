(() => {
  const root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  // Header: solid background after scrolling, mobile menu toggle.
  const header = document.querySelector('[data-header]');
  const burger = document.querySelector('[data-burger]');
  const nav = document.querySelector('[data-nav]');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setMenu = (open) => {
    header.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    const label = burger.querySelector('.sr-only');
    label.textContent = open ? label.dataset.closeLabel : label.dataset.openLabel;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && header.classList.contains('is-open')) { setMenu(false); burger.focus(); } });

  // Remember an explicit language choice for the "/" redirect.
  document.querySelectorAll('[data-lang]').forEach((a) =>
    a.addEventListener('click', () => { document.cookie = `lang=${a.dataset.lang};path=/;max-age=31536000;samesite=lax`; }),
  );

  // Reveal on scroll — only for blocks that start below the fold, so nothing visible ever flickers.
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.section-head, .service-grid > li, .concept, .package, .process > li, .facts, .gallery-grid picture, .format-grid > li, .why-grid > li, .addon-grid, .table-scroll')
      .forEach((el) => {
        if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('reveal'); io.observe(el); }
      });
  }

  // Lead form: validate, send as JSON, show inline status. Without JS the form posts normally.
  const form = document.querySelector('[data-lead-form]');
  if (!form) return;
  const status = form.querySelector('[data-status]');
  const button = form.querySelector('button[type="submit"]');
  const buttonText = button.textContent;
  const show = (kind) => {
    status.textContent = status.dataset[kind];
    status.className = `form-status field-full ${kind === 'success' ? 'ok' : 'err'}`;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let firstInvalid = null;
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      const bad = !el.checkValidity();
      if (el.name !== 'website') el.setAttribute('aria-invalid', String(bad));
      if (bad && !firstInvalid) firstInvalid = el;
    });
    if (firstInvalid) { show('invalid'); firstInvalid.focus(); return; }

    button.disabled = true;
    button.textContent = button.dataset.sending;
    try {
      const data = Object.fromEntries(new FormData(form));
      data.page = location.pathname;
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
      show('success');
    } catch {
      show('error');
    } finally {
      button.disabled = false;
      button.textContent = buttonText;
    }
  });
})();
