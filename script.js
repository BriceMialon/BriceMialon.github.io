/* Security: never allow this site to be framed (clickjacking) */
try { if (window.top !== window.self) { window.top.location = window.self.location; } } catch (eFrame) { }

/* =================================================================
   YOUTUBE FACADES — the #1 performance fix.
   No YouTube iframe (nor the iframe_api script) loads at page load.
   Each .yt-facade div becomes a real iframe only when its section
   approaches the viewport (or, for the hero, right after our own
   page has painted), so first paint / LCP never wait for YouTube.
   ================================================================= */
(function () {
  'use strict';

  /* Players that need the IFrame API, and what to do once both the
     API and their iframe exist. Guarded so each runs exactly once. */
  var ytDone = {};
  var ytSetups = {
    /* Fjord: true 35s-80s loop (loop=1&playlist= replays from 0s). */
    fjordPlayer: function () {
      new YT.Player('fjordPlayer', {
        events: {
          onStateChange: function (e) {
            if (e.data === YT.PlayerState.ENDED) {
              e.target.seekTo(35, true);
              e.target.playVideo();
            }
          }
        }
      });
    }
  };
  function ytTrySetup(id) {
    if (ytDone[id] || !ytSetups[id]) return;
    if (!(window.YT && window.YT.Player) || !document.getElementById(id)) return;
    ytDone[id] = 1;
    try { ytSetups[id](); } catch (e) { /* non-blocking */ }
  }
  window.__ytTrySetup = ytTrySetup;
  window.onYouTubeIframeAPIReady = function () {
    ytTrySetup('fjordPlayer');
  };

  var apiRequested = false;
  function ensureYtApi() {
    if (apiRequested || (window.YT && window.YT.Player)) return;
    apiRequested = true;
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }

  function buildFacade(f) {
    if (f.getAttribute('data-yt-built')) return;
    f.setAttribute('data-yt-built', '1');
    var src = f.getAttribute('data-yt-src') || '';
    /* keep enablejsapi working on any host: origin must match the page */
    try {
      if (location.protocol.indexOf('http') === 0 && src.indexOf('origin=') !== -1) {
        src = src.replace(/origin=[^&]+/, 'origin=' + encodeURIComponent(location.origin));
      }
    } catch (e) { /* non-blocking */ }
    var ifr = document.createElement('iframe');
    var fid = f.getAttribute('data-yt-id');
    if (fid) ifr.id = fid;
    ifr.src = src;
    ifr.title = f.getAttribute('data-yt-title') || '';
    ifr.setAttribute('frameborder', '0');
    ifr.setAttribute('allow', 'autoplay; encrypted-media');
    ifr.tabIndex = -1;
    if (f.parentNode) f.parentNode.replaceChild(ifr, f);
    if (src.indexOf('enablejsapi=1') !== -1) {
      ensureYtApi();
      if (fid) ytTrySetup(fid);
    }
  }

  function init() {
    var facades = Array.prototype.slice.call(document.querySelectorAll('.yt-facade'));
    if (!facades.length) return;

    var lazy = [], eager = [];
    facades.forEach(function (f) {
      (f.getAttribute('data-yt-eager') ? eager : lazy).push(f);
    });

    /* Hero video: wait until our own page has painted, then load it.
       First scroll/touch/click also triggers it immediately. */
    function loadEager() {
      eager.forEach(buildFacade);
      ['scroll', 'touchstart', 'pointerdown', 'keydown'].forEach(function (evt) {
        window.removeEventListener(evt, loadEager);
      });
    }
    if (eager.length) {
      ['scroll', 'touchstart', 'pointerdown', 'keydown'].forEach(function (evt) {
        window.addEventListener(evt, loadEager, { passive: true, once: false });
      });
      if (document.readyState === 'complete') { setTimeout(loadEager, 200); }
      else { window.addEventListener('load', function () { setTimeout(loadEager, 200); }); }
      setTimeout(loadEager, 3500); /* failsafe */
    }

    /* Section videos: load when the section is within ~1.5 screens. */
    if ('IntersectionObserver' in window) {
      var fio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { fio.unobserve(en.target); buildFacade(en.target); }
        });
      }, { rootMargin: '150% 0px 150% 0px' });
      lazy.forEach(function (f) { fio.observe(f); });
    } else {
      lazy.forEach(buildFacade);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();

document.addEventListener('DOMContentLoaded', function () {

  /* decode images off the main thread */
  document.querySelectorAll('img').forEach(function (im) { im.decoding = 'async'; });

  /* ---------- Nav scroll state ---------- */
  var nav = document.getElementById('nav');
  var progressBar = document.getElementById('scrollProgress');

  function onScroll() {
    var doc = document.documentElement;
    var scrollTop = window.scrollY || doc.scrollTop;
    var height = doc.scrollHeight - doc.clientHeight;
    var pct = height > 0 ? (scrollTop / height) * 100 : 0;
    progressBar.style.width = pct + '%';
    if (scrollTop > 12) { nav.classList.add('scrolled'); } else { nav.classList.remove('scrolled'); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  navToggle.addEventListener('click', function () {
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { navLinks.classList.remove('open'); });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealTargets = document.querySelectorAll('.reveal');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px 12% 0px' });
  revealTargets.forEach(function (el) { io.observe(el); });

  /* ---------- Stat count-up (harmless no-op if absent) ---------- */
  var statEls = document.querySelectorAll('.stat-num');
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1300;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var val = Math.floor(target * eased);
      el.textContent = val.toLocaleString('fr-FR') + suffix;
      if (progress < 1) { requestAnimationFrame(step); } else { el.textContent = target.toLocaleString('fr-FR') + suffix; }
    }
    requestAnimationFrame(step);
  }
  var statIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        animateCount(entry.target.querySelector('.stat-num'));
        statIo.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.stat-item').forEach(function (el) { statIo.observe(el); });

  /* ---------- Language bars (harmless no-op if absent) ---------- */
  document.querySelectorAll('.lang-bar-fill').forEach(function (el) {
    new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          el.style.width = (el.getAttribute('data-level') || '0') + '%';
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.4 }).observe(el);
  });

  /* ---------- Active nav link on scroll ---------- */
  var sections = document.querySelectorAll('section[id], header[id]');
  var navIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var id = entry.target.getAttribute('id');
      var link = document.querySelector('.nav-links a[href="#' + id + '"]');
      if (!link) return;
      if (entry.isIntersecting) {
        document.querySelectorAll('.nav-links a').forEach(function (a) { a.classList.remove('active'); });
        link.classList.add('active');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(function (s) { navIo.observe(s); });

  /* =========================================================
     LIGHTBOX (global) — opens an enlarged view for any photo
     or video tagged with data-lightbox-img / data-lightbox-video
  ========================================================= */
  var lightbox = document.getElementById('lightbox');
  var lightboxContent = document.getElementById('lightboxContent');
  var lightboxClose = document.getElementById('lightboxClose');

  function openLightboxImage(src, alt) {
    var cap = (alt || '').replace(/"/g, '');
    lightboxContent.innerHTML = '<img src="' + src + '" alt="' + cap + '">' +
      (cap ? '<div class="lightbox-caption">' + cap + '</div>' : '');
    lightbox.classList.add('open');
  }
  function openLightboxVideo(src, poster) {
    lightboxContent.innerHTML = '<video src="' + src + '" poster="' + (poster || '') + '" controls autoplay loop playsinline></video>';
    lightbox.classList.add('open');
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
    lightboxContent.innerHTML = '';
  }
  if (lightbox) {
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });
  }

  function wireStaticLightbox() {
    document.querySelectorAll('[data-lightbox-img]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        openLightboxImage(el.getAttribute('data-lightbox-img'), el.getAttribute('alt') || el.getAttribute('data-alt') || '');
      });
    });
    document.querySelectorAll('[data-lightbox-video]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        openLightboxVideo(el.getAttribute('data-lightbox-video'), el.getAttribute('data-poster') || '');
      });
    });
  }
  wireStaticLightbox();

  /* ---------- Carousels (tap slide = lightbox, drag/arrows = navigate) ---------- */
  document.querySelectorAll('[data-carousel]').forEach(function (root) {
    var track = root.querySelector('.carousel-track');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.carousel-slide'));
    var dotsWrap = root.querySelector('.carousel-dots');
    var counter = root.querySelector('.carousel-counter');
    var prevBtn = root.querySelector('.carousel-arrow.prev');
    var nextBtn = root.querySelector('.carousel-arrow.next');
    var index = 0;
    var total = slides.length;

    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(dot);
    });
    var dots = Array.prototype.slice.call(dotsWrap.children);

    function render() {
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      dots.forEach(function (d, i) { d.classList.toggle('active', i === index); });
      if (counter) counter.textContent = (index + 1) + '/' + total;
    }
    function goTo(i) { index = (i + total) % total; render(); }

    prevBtn.addEventListener('click', function () { goTo(index - 1); });
    nextBtn.addEventListener('click', function () { goTo(index + 1); });

    function openCurrentSlideLightbox() {
      var slide = slides[index];
      var video = slide.querySelector('video');
      if (video) {
        openLightboxVideo(video.getAttribute('src'), video.getAttribute('poster'));
      } else {
        var img = slide.querySelector('img');
        if (img) openLightboxImage(img.getAttribute('src'), img.getAttribute('alt'));
      }
    }

    var startX = 0, currentX = 0, dragging = false;
    root.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.carousel-arrow') || e.target.closest('.carousel-dots')) return;
      dragging = true; startX = e.clientX; currentX = e.clientX;
      track.style.transition = 'none';
    });
    root.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      currentX = e.clientX;
      var delta = currentX - startX;
      track.style.transform = 'translateX(calc(-' + (index * 100) + '% + ' + delta + 'px))';
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      track.style.transition = '';
      var delta = currentX - startX;
      if (Math.abs(delta) > 60) {
        if (delta < 0) { goTo(index + 1); } else { goTo(index - 1); }
      } else {
        render();
        if (Math.abs(delta) < 6) { openCurrentSlideLightbox(); }
      }
    }
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointerleave', function () { if (dragging) endDrag(); });

    render();
  });

  /* ---------- Gallery (featured + filmstrip) ---------- */
  document.querySelectorAll('[data-gallery]').forEach(function (root) {
    var main = root.querySelector('.gallery-main');
    var caption = root.querySelector('.gallery-caption');
    var thumbs = Array.prototype.slice.call(root.querySelectorAll('.gallery-thumb'));

    function setActive(thumb) {
      thumbs.forEach(function (t) { t.classList.remove('active'); });
      thumb.classList.add('active');
    }

    function showThumb(thumb) {
      var type = thumb.getAttribute('data-type');
      var cap = thumb.getAttribute('data-caption') || '';
      if (type === 'video') {
        var src = thumb.getAttribute('data-src');
        var poster = thumb.getAttribute('data-poster');
        main.innerHTML = '<video src="' + src + '" poster="' + poster + '" muted loop playsinline preload="metadata"></video>';
      } else {
        var srcImg = thumb.getAttribute('data-src');
        main.innerHTML = '<img src="' + srcImg + '" alt="' + cap.replace(/"/g, '') + '">';
      }
      if (caption) caption.textContent = cap;
      setActive(thumb);
    }

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () { showThumb(thumb); });
    });

    main.addEventListener('click', function () {
      var video = main.querySelector('video');
      if (video) {
        openLightboxVideo(video.getAttribute('src'), video.getAttribute('poster'));
      } else {
        var img = main.querySelector('img');
        if (img) openLightboxImage(img.getAttribute('src'), img.getAttribute('alt'));
      }
    });
  });

  /* ---------- Editorial hero / duo / trio / marquee: click main media = lightbox ---------- */
  function wireMediaContainer(selector) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener('click', function (e) {
        var video = el.querySelector('video');
        if (video) {
          openLightboxVideo(video.getAttribute('src'), video.getAttribute('poster'));
          return;
        }
        var img = el.querySelector('img');
        if (img) openLightboxImage(img.getAttribute('src'), img.getAttribute('alt'));
      });
    });
  }
  wireMediaContainer('.editorial-main');
  wireMediaContainer('.editorial-inset');
  wireMediaContainer('.duo-item');
  wireMediaContainer('.trio-item');
  wireMediaContainer('.marquee-item');

  /* ---------- Testimonial carousel ---------- */
  document.querySelectorAll('[data-testi]').forEach(function (root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll('.testi-slide'));
    var dotsWrap = root.querySelector('.testi-dots');
    var prevBtn = root.querySelector('.testi-arrow.prev');
    var nextBtn = root.querySelector('.testi-arrow.next');
    var index = 0;

    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(dot);
    });
    var dots = Array.prototype.slice.call(dotsWrap.children);

    function render() {
      slides.forEach(function (s, i) { s.classList.toggle('active', i === index); });
      dots.forEach(function (d, i) { d.classList.toggle('active', i === index); });
    }
    function goTo(i) { index = (i + slides.length) % slides.length; render(); }

    prevBtn.addEventListener('click', function () { goTo(index - 1); });
    nextBtn.addEventListener('click', function () { goTo(index + 1); });
    render();
  });

  /* ---------- Hero fist "becomes the text" reveal (one-time) ----------
     Only the headline shows at first. ~1s before the boxing video's first
     loop ends (7s of 8s), a fist appears dead-center over the video, punches
     open through two growth beats until it's roughly as big as the headline
     block, then dissolves right as the rest of the hero text (eyebrow,
     byline, CTAs) crossfades in beneath it, so the two beats overlap and
     read as one continuous transformation rather than two separate ones. */
  var heroFist = document.getElementById('heroFist');
  var heroRestEls = document.querySelectorAll('.hero-reveal-rest');
  if (heroFist && heroRestEls.length) {
    var reduceMotionHero = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotionHero) {
      heroRestEls.forEach(function (el) { el.classList.add('show'); });
      heroFist.style.display = 'none';
    } else {
      setTimeout(function () {
        heroFist.classList.add('punch');
        /* Text crossfades in during the fist's final fade-out (its 2.1s
           animation stays fully opaque until ~82%, i.e. ~1.7s in), so the
           two overlap instead of happening one after the other. */
        setTimeout(function () {
          heroRestEls.forEach(function (el) { el.classList.add('show'); });
        }, 1700);
        setTimeout(function () { heroFist.style.display = 'none'; }, 2200);
      }, 7000);
    }
  }

  /* ---------- Fjord intro caption: starts near the TOP of the section,
     then travels down to its resting centered position and keeps fading
     in continuously as you scroll further down through the section, so
     both its position and opacity are driven entirely by scroll progress
     rather than a fixed trigger point. ---------- */
  var fjordSection = document.querySelector('.hero-video-b');
  var fjordIntroEl = document.getElementById('fjordIntro');
  var fjordPhotoEl = document.getElementById('fjordPhotoPro');
  if (fjordSection && fjordIntroEl) {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      if (fjordPhotoEl) { fjordPhotoEl.style.opacity = 1; fjordPhotoEl.style.pointerEvents = 'auto'; }
    } else {
      var ticking = false;
      function updateFjordParallax() {
        var rect = fjordSection.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        // progress: 0 as the section enters from below, 1 as it exits at the top
        var progress = 1 - (rect.top + rect.height) / (vh + rect.height);
        progress = Math.min(Math.max(progress, 0), 1);
        var fadeIn = Math.min(progress / 0.55, 1); /* keeps building in as you scroll */
        var settle = Math.min(progress / 0.7, 1); /* reaches its resting spot by 70% through */
        var startHigh = vh * 0.32; /* how far above center "the top of the section" sits */
        var offset = startHigh * (1 - settle); /* large upward offset at start, 0 once settled */
        fjordIntroEl.style.opacity = fadeIn;
        fjordIntroEl.style.transform = 'translate(-50%, calc(-50% - ' + offset + 'px))';
        /* Photo only shows up in the final stretch of the section, as if it
           arrives right at the end of the video. */
        if (fjordPhotoEl) {
          var photoProgress = Math.min(Math.max((progress - 0.6) / 0.3, 0), 1);
          fjordPhotoEl.style.opacity = photoProgress;
          fjordPhotoEl.style.transform = 'translate(-50%, ' + ((1 - photoProgress) * 26) + 'px)';
          fjordPhotoEl.style.pointerEvents = photoProgress > 0.1 ? 'auto' : 'none';
        }
        ticking = false;
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { requestAnimationFrame(updateFjordParallax); ticking = true; }
      }, { passive: true });
      updateFjordParallax();
    }
  }

});

/* =================================================================
   CINEMATIC LAYER
   Preloader, Lenis smooth scroll, split-text reveals, custom cursor,
   magnetic buttons, depth parallax, chapter watermarks, hero zoom,
   auto-hiding nav, in-view video autoplay.
   Fully skipped with prefers-reduced-motion; degrades without JS.
   ================================================================= */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Split text into masked words (keeps inner spans like .hl) */
  function splitWords(el) {
    var idx = 0;
    function makeWord(text, cls) {
      var mask = document.createElement('span'); mask.className = 'hw';
      var inner = document.createElement('span'); inner.className = 'hw-i';
      inner.style.setProperty('--i', idx++);
      if (cls) {
        var keep = document.createElement('span'); keep.className = cls; keep.textContent = text;
        inner.appendChild(keep);
      } else { inner.textContent = text; }
      mask.appendChild(inner);
      return mask;
    }
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      var cls = node.nodeType === 1 ? node.className : null;
      var text = node.textContent;
      text.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        frag.appendChild(makeWord(part, cls));
      });
    });
    el.innerHTML = '';
    el.appendChild(frag);
    el.classList.add('split');
  }

  var heroH1 = document.querySelector('.hero-immersive h1');
  if (!reduceMotion && heroH1) { try { splitWords(heroH1); } catch (e) { heroH1.classList.remove('split'); } }

  if (!reduceMotion) {
    var h2s = document.querySelectorAll('.section-head h2, .theme-text h2, .definit-intro h2, .contact h2');
    var h2io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('play'); h2io.unobserve(en.target); }
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -40px 0px' });
    h2s.forEach(function (h) {
      try { splitWords(h); h2io.observe(h); } catch (e) { h.classList.remove('split'); }
    });
  }

  /* ---------- Preloader (cinema opening, shorter on repeat visits) */
  var preloader = document.getElementById('preloader');
  function introDone() {
    if (heroH1 && heroH1.classList.contains('split')) {
      requestAnimationFrame(function () { heroH1.classList.add('play'); });
    }
  }
  var seenIntro = false;
  try { seenIntro = sessionStorage.getItem('bm-intro') === '1'; } catch (e) { }
  if (preloader && !reduceMotion && !seenIntro) {
    document.body.classList.add('is-loading');
    var minTime = 1400;
    var startT = performance.now();
    var countEl = document.getElementById('preloaderCount');
    var barEl = document.getElementById('preloaderBar');
    var pageLoaded = false, finished = false, loadedAt = null, pctAtLoad = 0;
    /* Deliberately NOT tied to window "load": heavy media must never
       hold the visitor behind the curtain. Fixed, short opening. */
    setTimeout(function () { pageLoaded = true; }, 1100);
    function finishPreloader() {
      if (finished) return;
      finished = true;
      try { sessionStorage.setItem('bm-intro', '1'); } catch (e) { }
      preloader.classList.add('done');
      document.body.classList.remove('is-loading');
      introDone();
    }
    /* Progress is time-based (not frame-based) so it completes reliably
       even when rAF is throttled in background tabs. */
    (function tickPreloader(now) {
      now = now || performance.now();
      var elapsed = now - startT;
      var pct;
      if (pageLoaded && loadedAt === null) {
        loadedAt = now;
        pctAtLoad = Math.min(88, elapsed / 28);
      }
      if (loadedAt === null) {
        pct = Math.min(88, elapsed / 28);
      } else {
        var f = Math.min(1, (now - loadedAt) / 600);
        pct = pctAtLoad + (100 - pctAtLoad) * (1 - Math.pow(1 - f, 2));
      }
      if (countEl) countEl.textContent = Math.round(pct);
      if (barEl) barEl.style.width = pct + '%';
      if (pct >= 99.9 && elapsed >= minTime) { finishPreloader(); return; }
      requestAnimationFrame(tickPreloader);
    })();
    /* absolute failsafe (setTimeout survives rAF throttling) */
    setTimeout(finishPreloader, 3200);
  } else {
    if (preloader) preloader.parentNode.removeChild(preloader);
    introDone();
  }

  /* ---------- Lenis smooth scroll (inertial, cinematic) */
  var lenis = null;
  if (!reduceMotion && typeof window.Lenis === 'function') {
    try {
      lenis = new Lenis({ lerp: 0.095, wheelMultiplier: 1, smoothWheel: true });
      window.__lenis = lenis; /* exposed for debugging */
      (function rafLenis(t) { lenis.raf(t); requestAnimationFrame(rafLenis); })(0);
    } catch (e) { lenis = null; }
  }

  /* Anchor navigation through Lenis (with nav offset + stage flash) */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var offset = id === '#top' ? 0 : -74;
      if (lenis) { lenis.scrollTo(target, { offset: offset, duration: 1.5 }); }
      else { target.scrollIntoView({ behavior: 'smooth' }); }
      if (id === '#contact-stage') {
        setTimeout(function () {
          target.classList.remove('flash');
          void target.offsetWidth;
          target.classList.add('flash');
        }, 1000);
      }
      try { history.replaceState(null, '', id); } catch (err) { }
    });
  });

  /* ---------- Custom cursor (desktop only) */
  if (finePointer && !reduceMotion) {
    var dot = document.getElementById('cursorDot');
    var ring = document.getElementById('cursorRing');
    var labelEl = document.getElementById('cursorLabel');
    if (dot && ring) {
      document.documentElement.classList.add('has-cursor');
      var mx = innerWidth / 2, my = innerHeight / 2, rxp = mx, ryp = my;
      var scale = 1, targetScale = 1;
      document.addEventListener('mousemove', function (e) {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
      }, { passive: true });
      (function rafCursor() {
        rxp += (mx - rxp) * 0.16;
        ryp += (my - ryp) * 0.16;
        scale += (targetScale - scale) * 0.25;
        ring.style.transform = 'translate3d(' + rxp + 'px,' + ryp + 'px,0) translate(-50%,-50%) scale(' + scale.toFixed(3) + ')';
        requestAnimationFrame(rafCursor);
      })();
      document.addEventListener('mousedown', function () { targetScale = 0.8; });
      document.addEventListener('mouseup', function () { targetScale = 1; });
      var mediaSel = '.editorial-main,.editorial-inset,.duo-item,.trio-item,.gallery-main,.marquee-item,.carousel-slide,.rb-photo';
      var linkSel = 'a,button';
      document.addEventListener('mouseover', function (e) {
        if (!(e.target instanceof Element)) return;
        var onControl = e.target.closest('.carousel-arrow,.carousel-dots,.gallery-thumb,.lightbox-close');
        var media = onControl ? null : e.target.closest(mediaSel);
        var link = e.target.closest(linkSel);
        if (media) {
          ring.classList.add('is-media'); ring.classList.remove('is-link');
          if (labelEl) labelEl.textContent = media.classList.contains('cloud-photo') ? 'Découvrir' : 'Voir';
        } else if (link || onControl) {
          ring.classList.add('is-link'); ring.classList.remove('is-media');
        } else {
          ring.classList.remove('is-link'); ring.classList.remove('is-media');
        }
      });
      document.addEventListener('mouseleave', function () { dot.classList.add('is-hidden'); ring.classList.add('is-hidden'); });
      document.addEventListener('mouseenter', function () { dot.classList.remove('is-hidden'); ring.classList.remove('is-hidden'); });
    }

    /* ---------- Magnetic buttons */
    document.querySelectorAll('.btn, .nav-logo').forEach(function (btn) {
      var strength = 0.28;
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * strength;
        var y = (e.clientY - r.top - r.height / 2) * strength;
        btn.style.transition = 'transform .15s ease-out';
        btn.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transition = 'transform .5s cubic-bezier(.22,.9,.3,1.4)';
        btn.style.transform = '';
      });
    });
  }

  /* ---------- Shared scroll-driven frame: hero zoom, parallax,
     chapter watermarks, auto-hiding nav */
  if (!reduceMotion) {
    var heroBg = document.querySelector('.hero-immersive .hero-immersive-bg');
    var heroContent = document.querySelector('.hero-immersive-content');
    var navEl = document.getElementById('nav');
    var navLinksEl = document.getElementById('navLinks');
    var lastY = 0;

    var plxZones = [];
    if (finePointer) {
      document.querySelectorAll('.editorial-main,.gallery-main,.duo-item,.trio-item').forEach(function (z) {
        z.classList.add('plx-zone');
        plxZones.push(z);
      });
    }

    var watermarks = [];
    var wmIndex = 0;
    document.querySelectorAll('.theme-section').forEach(function (sec) {
      var num = sec.querySelector('.theme-num, .section-head .eyebrow');
      if (!num) return;
      var m = num.textContent.match(/\d+/);
      if (!m) return;
      var w = document.createElement('div');
      w.className = 'theme-watermark';
      w.textContent = m[0];
      if (wmIndex % 2 === 1) { w.style.right = 'auto'; w.style.left = '-14px'; }
      wmIndex++;
      sec.appendChild(w);
      watermarks.push({ sec: sec, el: w });
    });

    var dirty = true;
    window.addEventListener('scroll', function () { dirty = true; }, { passive: true });
    window.addEventListener('resize', function () { dirty = true; }, { passive: true });

    (function frame() {
      if (dirty) {
        dirty = false;
        var y = window.scrollY || document.documentElement.scrollTop;
        var vh = window.innerHeight || document.documentElement.clientHeight;

        /* hero cinematic zoom-out */
        if (heroBg && heroContent && y < vh * 1.2) {
          var p = Math.min(Math.max(y / vh, 0), 1);
          heroBg.style.transform = 'scale(' + (1 + p * 0.12).toFixed(4) + ')';
          heroContent.style.transform = 'translateY(' + (-p * 90).toFixed(1) + 'px)';
          heroContent.style.opacity = Math.max(1 - p * 1.4, 0).toFixed(3);
        }

        /* depth parallax on media */
        for (var i = 0; i < plxZones.length; i++) {
          var z = plxZones[i];
          var r = z.getBoundingClientRect();
          if (r.bottom < -120 || r.top > vh + 120) continue;
          var prog = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
          var media = z.querySelector('img,video');
          if (media) media.style.setProperty('--plx-y', (prog * -16).toFixed(1) + 'px');
        }

        /* chapter numerals drift slower than the page (depth) */
        for (var k = 0; k < watermarks.length; k++) {
          var wm = watermarks[k];
          var rs = wm.sec.getBoundingClientRect();
          if (rs.bottom < -200 || rs.top > vh + 200) continue;
          var wp = (rs.top + rs.height / 2 - vh / 2) / (vh / 2 + rs.height / 2);
          wm.el.style.transform = 'translateY(' + (wp * 70).toFixed(1) + 'px)';
        }

        /* nav: hide scrolling down, show scrolling up */
        if (navEl) {
          var menuOpen = navLinksEl && navLinksEl.classList.contains('open');
          if (y > 520 && y > lastY + 2 && !menuOpen) navEl.classList.add('nav-hidden');
          else if (y < lastY - 2 || y <= 520) navEl.classList.remove('nav-hidden');
          lastY = y;
        }
      }
      requestAnimationFrame(frame);
    })();
  }

  /* ---------- Videos: play softly while in view, pause once gone */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting && en.intersectionRatio >= 0.35) {
          var playP = v.play();
          if (playP && playP.catch) playP.catch(function () { });
          if (v.parentElement) v.parentElement.classList.add('playing');
        } else {
          v.pause();
        }
      });
    }, { threshold: [0, 0.35] });
    document.querySelectorAll('.theme-section video, .duo-item video, .editorial-main video').forEach(function (v) {
      vio.observe(v);
    });
    /* ---------- 06 · Investissement: trailer reveal driven by scroll.
       The rounded "screen" expands to full-bleed as you scroll into the
       pinned section, then the manifesto text rises out of the picture. */
    var investSec = document.getElementById('investissement');
    var investFrame = investSec ? investSec.querySelector('.invest-frame') : null;
    var investContent = investSec ? investSec.querySelector('.invest-content') : null;
    if (investSec && investFrame && investContent) {
      var investDirty = true;
      window.addEventListener('scroll', function () { investDirty = true; }, { passive: true });
      window.addEventListener('resize', function () { investDirty = true; }, { passive: true });
      (function investLoop() {
        if (investDirty) {
          investDirty = false;
          var vh2 = window.innerHeight || document.documentElement.clientHeight;
          var rI = investSec.getBoundingClientRect();
          var total = rI.height - vh2;
          if (total > 0 && rI.top < vh2 && rI.bottom > 0) {
            var p = Math.min(Math.max(-rI.top / total, 0), 1);
            var pe = Math.min(p / 0.55, 1);
            var ease = 1 - Math.pow(1 - pe, 3); /* screen expansion */
            investFrame.style.transform = 'scale(' + (0.62 + 0.38 * ease).toFixed(4) + ')';
            investFrame.style.borderRadius = ((1 - ease) * 42).toFixed(1) + 'px';
            var tp = Math.min(Math.max((p - 0.5) / 0.3, 0), 1); /* text rise */
            investContent.style.opacity = tp.toFixed(3);
            investContent.style.transform = 'translateY(' + ((1 - tp) * 52).toFixed(1) + 'px) scale(' + (0.95 + 0.05 * tp).toFixed(4) + ')';
          }
        }
        requestAnimationFrame(investLoop);
      })();
    }

    /* ---------- 03 · International: horizontal photo immersion.
       Vertical scroll drives the track sideways through full-screen
       photographs; each image gets a soft counter-parallax so the
       journey feels layered rather than flat. */
    var intlSec = document.querySelector('.intl-cinema');
    var intlTrack = document.getElementById('intlTrack');
    var intlCounter = document.getElementById('intlCounter');
    if (intlSec && intlTrack) {
      intlSec.classList.add('intl-on');
      var intlPanels = Array.prototype.slice.call(intlTrack.children);
      var intlImgs = intlPanels.map(function (p) { return p.querySelector('img'); });
      var intlDirty = true;
      window.addEventListener('scroll', function () { intlDirty = true; }, { passive: true });
      window.addEventListener('resize', function () { intlDirty = true; }, { passive: true });
      (function intlLoop() {
        if (intlDirty) {
          intlDirty = false;
          var vhI = window.innerHeight || document.documentElement.clientHeight;
          var vwI = window.innerWidth || document.documentElement.clientWidth;
          var rI2 = intlSec.getBoundingClientRect();
          var totalI = rI2.height - vhI;
          if (totalI > 0 && rI2.top < vhI && rI2.bottom > 0) {
            var pI = Math.min(Math.max(-rI2.top / totalI, 0), 1);
            var dist = intlTrack.scrollWidth - vwI;
            intlTrack.style.transform = 'translate3d(' + (-pI * dist).toFixed(1) + 'px,0,0)';
            var slideF = pI * (intlPanels.length - 1);
            for (var ii = 0; ii < intlImgs.length; ii++) {
              if (!intlImgs[ii]) continue;
              var rel = slideF - ii;
              if (rel > -1.2 && rel < 1.2) {
                intlImgs[ii].style.transform = 'scale(1.1) translateX(' + (rel * vwI * 0.06).toFixed(1) + 'px)';
              }
            }
            if (intlCounter) {
              var active = Math.min(intlPanels.length, Math.round(slideF) + 1);
              intlCounter.textContent = '0' + active + ' / 0' + intlPanels.length;
            }
          }
        }
        requestAnimationFrame(intlLoop);
      })();
    }

    /* ---------- 07 · Red Bull: diagonal wipe reveal driven by scroll.
       The brand film slices in as a thin diagonal band, sweeps open to
       full-bleed while a giant outlined tagline flies across, then the
       copy slides in from the left and the team photo lands. */
    var rbSec = document.querySelector('.rb-cinema');
    var rbFrame = document.getElementById('rbFrame');
    var rbBgEl = document.getElementById('rbBg');
    var rbFly = document.getElementById('rbFlyline');
    var rbContent = document.getElementById('rbContent');
    var rbPhoto = document.getElementById('rbPhoto');
    if (rbSec && rbFrame && rbContent) {
      var rbDirty = true;
      window.addEventListener('scroll', function () { rbDirty = true; }, { passive: true });
      window.addEventListener('resize', function () { rbDirty = true; }, { passive: true });
      function lerpRb(a, b, t) { return a + (b - a) * t; }
      (function rbLoop() {
        if (rbDirty) {
          rbDirty = false;
          var vh3 = window.innerHeight || document.documentElement.clientHeight;
          var rR = rbSec.getBoundingClientRect();
          var total = rR.height - vh3;
          if (total > 0 && rR.top < vh3 && rR.bottom > 0) {
            var p = Math.min(Math.max(-rR.top / total, 0), 1);
            /* phase 1 — diagonal band sweeps open (0 → .5) */
            var w = Math.min(p / 0.5, 1);
            var we = 1 - Math.pow(1 - w, 3);
            rbFrame.style.clipPath = 'polygon(0% ' + lerpRb(58, 0, we) + '%, 100% ' + lerpRb(38, 0, we) +
              '%, 100% ' + lerpRb(46, 100, we) + '%, 0% ' + lerpRb(66, 100, we) + '%)';
            if (rbBgEl) rbBgEl.style.transform = 'scale(' + lerpRb(1.25, 1, we).toFixed(4) + ')';
            /* tagline flies right → left across the whole pin, fades as copy lands */
            if (rbFly) {
              rbFly.style.transform = 'translateY(-50%) translateX(' + lerpRb(15, -75, p) + 'vw)';
              rbFly.style.opacity = p < 0.55 ? 1 : Math.max(1 - (p - 0.55) / 0.2, 0).toFixed(3);
            }
            /* phase 2 — copy slides in from the left (.5 → .8) */
            var tp = Math.min(Math.max((p - 0.5) / 0.3, 0), 1);
            var te = 1 - Math.pow(1 - tp, 3);
            rbContent.style.opacity = te.toFixed(3);
            rbContent.style.transform = 'translateX(' + ((1 - te) * -70).toFixed(1) + 'px)';
            /* team photo lands last (.65 → .9) */
            if (rbPhoto) {
              var pp = Math.min(Math.max((p - 0.65) / 0.25, 0), 1);
              var pe2 = 1 - Math.pow(1 - pp, 3);
              rbPhoto.style.opacity = pe2.toFixed(3);
              rbPhoto.style.transform = 'rotate(' + lerpRb(9, 3, pe2) + 'deg) translateY(' + ((1 - pe2) * 70).toFixed(1) + 'px) scale(' + lerpRb(0.9, 1, pe2).toFixed(4) + ')';
            }
          }
        }
        requestAnimationFrame(rbLoop);
      })();
    }

    /* gallery main media is swapped dynamically — autoplay the new video too */
    document.querySelectorAll('.gallery-thumb').forEach(function (t) {
      t.addEventListener('click', function () {
        setTimeout(function () {
          var v = document.querySelector('.gallery-main video');
          if (v) {
            var pr = v.play();
            if (pr && pr.catch) pr.catch(function () { });
            vio.observe(v);
          }
        }, 60);
      });
    });
  }
})();

