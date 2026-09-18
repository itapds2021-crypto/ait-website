/* ============================================================
   A.I.T ENGINEERS — interaction layer
   Vanilla JS. No libraries. IntersectionObserver-driven.
   ============================================================ */
(function () {
  'use strict';
 
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var isReduced = function () { return reduce.matches; };
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
 
  /* ---------- 1. HERO INTRO SEQUENCE ---------- */
  function boot() {
    document.body.classList.remove('is-preload');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { document.body.classList.add('is-ready'); });
    });
  }
  if (document.readyState === 'complete') { boot(); }
  else { window.addEventListener('load', boot); setTimeout(boot, 1200); }
 
  /* ---------- 2. HEADER SCROLL STATE ---------- */
  var hdr = $('#hdr');
  var stuck = false;
  function headerState(y) {
    var next = y > 40;
    if (next !== stuck) { stuck = next; hdr.classList.toggle('is-stuck', stuck); }
  }
 
  /* ---------- 3. MOBILE MENU ---------- */
  var burger = $('#burger');
  var mmenu  = $('#mobilemenu');
  var menuOpen = false;
 
  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mmenu.classList.toggle('is-open', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) { hdr.classList.add('is-stuck'); }
    else { headerState(window.pageYOffset); }
  }
  if (burger && mmenu) {
    mmenu.removeAttribute('hidden');
    burger.addEventListener('click', function () { setMenu(!menuOpen); });
    $$('a', mmenu).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); }
    });
    window.addEventListener('resize', function () {
      if (menuOpen && window.innerWidth > 1024) { setMenu(false); }
    });
  }
 
  /* ---------- 4. SCROLL REVEAL ---------- */
  var revealTargets = $$('[data-reveal], .reveal-mask, #timeline, .cta');
  if ('IntersectionObserver' in window && !isReduced()) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
        if (en.target.hasAttribute('data-count-host')) { runCounters(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-in'); });
  }
 
  /* Safety sweep: an instant jump (anchor link, restored scroll position, or a
     browser that skips IO frames) can leave passed-over elements hidden.
     Runs inside the shared rAF loop below. */
  function sweepReveals() {
    if (!revealTargets.length) return;
    var limit = window.innerHeight * 0.9;
    revealTargets = revealTargets.filter(function (el) {
      if (el.classList.contains('is-in')) return false;
      if (el.getBoundingClientRect().top < limit) { el.classList.add('is-in'); return false; }
      return true;
    });
  }
 
  /* ---------- 5. ANIMATED COUNTERS ---------- */
  function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }
 
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    if (isReduced()) { el.textContent = String(target); return; }
    var dur = 1600, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = String(Math.round(easeOutQuint(p) * target));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
 
  function runCounters(scope) { $$('.count', scope).forEach(animateCount); }
 
  var counters = $$('.count');
  if (counters.length) {
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          animateCount(en.target);
          cio.unobserve(en.target);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (c) { cio.observe(c); });
    } else {
      counters.forEach(animateCount);
    }
  }
 
  /* ---------- 6. PARALLAX ---------- */
  var pxItems = $$('[data-parallax]').map(function (el) {
    return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.1, y: 0 };
  });
 
  function updateParallax() {
    if (isReduced()) return;
    var vh = window.innerHeight;
    for (var i = 0; i < pxItems.length; i++) {
      var it = pxItems[i];
      var host = it.el.parentElement || it.el;
      var r = host.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      var progress = (r.top + r.height / 2 - vh / 2) / vh;   /* -1 .. 1 */
      var shift = -progress * it.speed * 120;
      it.el.style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0)';
    }
  }
 
  /* ---------- 7. SINGLE rAF SCROLL LOOP ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset;
      headerState(y);
      updateParallax();
      sweepReveals();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
 
  /* ---------- 8. FAQ ACCORDION ---------- */
  $$('.acc__q').forEach(function (btn) {
    var panel = btn.parentElement.nextElementSibling;
    if (!panel) return;
 
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
 
      /* close siblings within the same accordion */
      var acc = btn.closest('.acc');
      if (acc && !open) {
        $$('.acc__q[aria-expanded="true"]', acc).forEach(function (other) {
          other.setAttribute('aria-expanded', 'false');
          var op = other.parentElement.nextElementSibling;
          if (op) { op.style.height = op.scrollHeight + 'px'; void op.offsetHeight; op.style.height = '0px'; }
        });
      }
 
      btn.setAttribute('aria-expanded', String(!open));
      if (open) {
        panel.style.height = panel.scrollHeight + 'px';
        void panel.offsetHeight;
        panel.style.height = '0px';
      } else {
        panel.style.height = panel.scrollHeight + 'px';
        var done = function () {
          panel.style.height = 'auto';
          panel.removeEventListener('transitionend', done);
        };
        panel.addEventListener('transitionend', done);
      }
    });
  });
  window.addEventListener('resize', function () {
    $$('.acc__q[aria-expanded="true"]').forEach(function (b) {
      var p = b.parentElement.nextElementSibling;
      if (p) p.style.height = 'auto';
    });
  });
 
  /* ---------- 9. TESTIMONIAL SLIDER ---------- */
  var stage = $('[data-slider]');
  if (stage) {
    var slides = $$('.tst__slide', stage);
    var dots   = $$('.tst__dots button', stage);
    var idx = 0, timer = null;
 
    function show(n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
      dots.forEach(function (d, i) {
        d.classList.toggle('is-on', i === idx);
        d.setAttribute('aria-selected', String(i === idx));
      });
    }
    function play() {
      if (isReduced()) return;
      stop();
      timer = setInterval(function () { show(idx + 1); }, 7000);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
 
    $('[data-next]', stage).addEventListener('click', function () { show(idx + 1); play(); });
    $('[data-prev]', stage).addEventListener('click', function () { show(idx - 1); play(); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { show(i); play(); }); });
    stage.addEventListener('mouseenter', stop);
    stage.addEventListener('mouseleave', play);
    stage.addEventListener('focusin', stop);
 
    show(0);
    play();
  }
 
  /* ---------- 10. IMAGE FALLBACK ---------- */
  $$('img').forEach(function (img) {
    img.addEventListener('error', function () {
      img.style.visibility = 'hidden';
      var host = img.parentElement;
      if (host) {
        host.style.background =
          'linear-gradient(135deg,#062B46 0%,#111820 60%,#05080B 100%)';
      }
    });
  });
 
  /* ---------- 11. SMOOTH ANCHOR SCROLL (header offset) ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      var offset = hdr ? hdr.offsetHeight : 0;
      var top = t.getBoundingClientRect().top + window.pageYOffset - offset + 1;
      window.scrollTo({ top: top, behavior: isReduced() ? 'auto' : 'smooth' });
    });
  });
 
  /* ---------- 12. NAV CURRENT SECTION (Disabled by user request) ---------- */
 
  /* ---------- 13. CUSTOM CURSOR (fine pointer only) ---------- */
  var cursor = $('#cursor');
  if (cursor && window.matchMedia('(pointer:fine)').matches && !isReduced()) {
    var cx = 0, cy = 0, tx = 0, ty = 0, running = false;
 
    function loop() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      if (running) requestAnimationFrame(loop);
    }
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!running) { running = true; cx = tx; cy = ty; cursor.classList.add('is-on'); loop(); }
    }, { passive: true });
    document.addEventListener('mouseleave', function () { cursor.classList.remove('is-on'); });
    document.addEventListener('mouseover', function (e) {
      var hot = e.target.closest('a,button,.cap,.ind,.prod,.why__row');
      cursor.classList.toggle('is-hot', !!hot);
    });
  }
 
  /* ---------- 14. FOOTER YEAR ---------- */
  var yr = $('#yr');
  if (yr) yr.textContent = String(new Date().getFullYear());
 
})();
