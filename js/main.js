(function () {
  var WA = 'https://wa.me/77067290032';

  // Lead form → prefilled WhatsApp message.
  var f = document.getElementById('lead');
  var a = document.getElementById('send');
  if (f && a) {
    var v = function (id) {
      var el = document.getElementById(id);
      return el && el.value.trim();
    };
    var build = function () {
      var lines = ['Здравствуйте! Хочу обсудить мероприятие.'];
      if (v('f-name')) lines.push('Имя: ' + v('f-name'));
      if (v('f-phone')) lines.push('Телефон: ' + v('f-phone'));
      lines.push('Формат: ' + v('f-format'));
      if (v('f-date')) lines.push('Дата: ' + v('f-date'));
      a.href = WA + '?text=' + encodeURIComponent(lines.join('\n'));
    };
    f.addEventListener('input', build);
    f.addEventListener('change', build);
    f.addEventListener('submit', function (e) { e.preventDefault(); });
    build();
  }

  // Projects carousel: arrows scroll by one slide, chips jump to the first slide of a format
  // and highlight the format currently in view.
  document.querySelectorAll('[data-carousel]').forEach(function (car) {
    var track = car.querySelector('.track');
    var slides = Array.prototype.slice.call(track.children);
    var chips = car.querySelectorAll('.chip');
    var prev = car.querySelector('[data-dir="-1"]');
    var next = car.querySelector('[data-dir="1"]');
    var step = function () { return slides[0].getBoundingClientRect().width + 16; };
    var scrollToSlide = function (el) { track.scrollTo({ left: el.offsetLeft - track.offsetLeft, behavior: 'smooth' }); };
    car.querySelectorAll('.car-btn').forEach(function (b) {
      b.addEventListener('click', function () { track.scrollBy({ left: step() * Number(b.dataset.dir), behavior: 'smooth' }); });
    });
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var first = track.querySelector('[data-cat="' + c.dataset.go + '"]');
        if (first) scrollToSlide(first);
      });
    });
    var sync = function () {
      var x = track.scrollLeft;
      var current = slides[0];
      slides.forEach(function (s) { if (s.offsetLeft - track.offsetLeft <= x + 8) current = s; });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.go === current.dataset.cat)); });
      prev.disabled = x <= 2;
      next.disabled = x >= track.scrollWidth - track.clientWidth - 2;
    };
    var t;
    track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(sync, 60); }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: step() * (e.key === 'ArrowRight' ? 1 : -1), behavior: 'smooth' }); }
    });
    sync();
  });

  // Videos load only when scrolled into view and pause off-screen; posters stay for reduced motion.
  var videos = document.querySelectorAll('video[data-src]');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!videos.length || reduce || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var el = en.target;
      if (en.isIntersecting) {
        if (!el.src) el.src = el.dataset.src;
        var p = el.play();
        if (p && p.catch) p.catch(function () {});
      } else if (el.src) {
        el.pause();
      }
    });
  }, { rootMargin: '200px 0px' });
  videos.forEach(function (el) { io.observe(el); });
})();
