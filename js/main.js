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
      if (v('f-guests')) lines.push('Гостей: ' + v('f-guests'));
      a.href = WA + '?text=' + encodeURIComponent(lines.join('\n'));
    };
    f.addEventListener('input', build);
    f.addEventListener('change', build);
    f.addEventListener('submit', function (e) { e.preventDefault(); });
    build();
  }

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
