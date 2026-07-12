/* ---------- Fjord video: true 35s-80s loop via the YouTube IFrame API ----------
   The loop=1&playlist=<id> URL trick only respects start= on the first play;
   once it restarts it replays from 0s, showing footage we don't want.
   The IFrame API lets us force it back to 35s every time it hits the end. */
window.onYouTubeIframeAPIReady = function () {
  var el = document.getElementById('fjordPlayer');
  if (!el) return;
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
};

document.addEventListener('DOMContentLoaded', function () {

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
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
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

  /* ---------- Fjord player: keep enablejsapi working on any host
     (the origin param must match the domain actually serving the page) */
  try {
    var fjordFrame = document.getElementById('fjordPlayer');
    if (fjordFrame && location.protocol.indexOf('http') === 0 &&
        fjordFrame.src.indexOf('origin=' + encodeURIComponent(location.origin)) === -1 &&
        fjordFrame.src.indexOf('origin=' + location.origin) === -1) {
      fjordFrame.src = fjordFrame.src.replace(/origin=[^&]+/, 'origin=' + encodeURIComponent(location.origin));
    }
  } catch (e) { /* non-blocking */ }

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
  if (preloader && !reduceMotion) {
    document.body.classList.add('is-loading');
    var seen = false;
    try { seen = sessionStorage.getItem('bm-intro') === '1'; } catch (e) { }
    var minTime = seen ? 600 : 1800;
    var startT = performance.now();
    var countEl = document.getElementById('preloaderCount');
    var barEl = document.getElementById('preloaderBar');
    var pageLoaded = false, finished = false, loadedAt = null, pctAtLoad = 0;
    window.addEventListener('load', function () { pageLoaded = true; });
    setTimeout(function () { pageLoaded = true; }, 4000); /* never hold visitors hostage */
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
    setTimeout(finishPreloader, Math.max(minTime, 4000) + 1800);
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

/* =================================================================
   VALUES GAME v2 — "Devine ce qui me définit"
   Arcade HUD, particle VFX, floating points, combo streaks and a
   social ranking. The matcher is deliberately generous: exact hits,
   synonyms, fuzzy spelling and loose associations all land on a
   card — a recruiter's good answer is never called wrong.
   ================================================================= */
(function () {
  'use strict';
  var grid = document.getElementById('vgGrid');
  var form = document.getElementById('vgForm');
  var input = document.getElementById('vgInput');
  var feedback = document.getElementById('vgFeedback');
  var scoreEl = document.getElementById('vgScore');
  var foundEl = document.getElementById('vgFoundCount');
  var barEl = document.getElementById('vgBar');
  var levelEl = document.getElementById('vgLevel');
  var rankEl = document.getElementById('vgRank');
  var revealBtn = document.getElementById('vgReveal');
  if (!grid || !form || !input) return;

  var VALUES = [
    { name: 'Écoute', syns: ['empathie', 'comprehension', 'bienveillance', 'attention aux autres', 'respect', 'dialogue', 'disponibilite', 'gentillesse', 'attentif'], why: 'Animer une Fresque du Climat m\'a appris à écouter avant de vouloir convaincre.', href: '#engagement' },
    { name: 'Fédérer', syns: ['leadership', 'leader', 'equipe', 'esprit d equipe', 'cohesion', 'collectif', 'management', 'manager', 'team spirit', 'entraide', 'solidarite', 'unir', 'rassembler', 'mobiliser', 'cooperation', 'collaboration', 'collaboratif', 'travail d equipe'], why: 'Un an à la tête du BDE GACO : 10 personnes, 40 événements, un seul collectif.', href: '#bde' },
    { name: 'Discipline', syns: ['rigueur', 'rigoureux', 'regularite', 'serieux', 'organisation', 'organise', 'constance', 'ponctualite', 'ponctuel', 'assiduite', 'methode', 'methodique', 'professionnalisme', 'exigence', 'travail bien fait'], why: 'La boxe et l\'investissement m\'ont appris la même chose : la régularité paie.', href: '#depassement' },
    { name: 'Sang-froid', syns: ['sang froid', 'sangfroid', 'calme', 'gestion du stress', 'stress', 'pression', 'maitrise de soi', 'maitrise', 'self control', 'gestion de crise', 'zen', 'serenite', 'resistance au stress'], why: 'Monter sur un ring devant 400 personnes, ça relativise une réunion tendue.', href: '#depassement' },
    { name: 'Ouverture d\'esprit', syns: ['ouverture', 'international', 'tolerance', 'diversite', 'ouvert', 'multiculturel', 'interculturel', 'inclusion', 'voyage', 'ouvert d esprit'], why: 'Un double diplôme au Québec, loin de mes repères : observer avant de juger.', href: '#international' },
    { name: 'Curiosité', syns: ['apprendre', 'apprentissage', 'decouverte', 'soif d apprendre', 'curieux', 'creativite', 'creatif', 'innovation', 'innovant', 'imagination', 'veille', 'apprendre vite', 'esprit d innovation'], why: 'Comprendre comment chaque chose fonctionne, des marchés aux personnes.', href: '#investissement' },
    { name: 'Énergie', syns: ['dynamisme', 'dynamique', 'enthousiasme', 'motivation', 'motive', 'punch', 'passion', 'passionne', 'proactivite', 'proactif', 'entrain', 'peps', 'vitalite', 'implication', 'bonne humeur', 'sourire', 'positif', 'positivite', 'optimisme', 'optimiste', 'joie de vivre', 'engagement'], why: 'Student Marketeer Red Bull : l\'énergie, c\'est littéralement le métier.', href: '#redbull' },
    { name: 'Patience', syns: ['long terme', 'temps long', 'temperance', 'patient', 'endurance'], why: 'Investir sur la durée m\'a appris que le temps travaille pour moi.', href: '#investissement' },
    { name: 'Humilité', syns: ['modestie', 'modeste', 'remise en question', 'humble', 'simplicite', 'apprendre de ses erreurs', 'remise en cause'], why: 'Nouvelle culture, nouvel accent : j\'ai réappris à écouter avant de parler.', href: '#international' },
    { name: 'Adaptabilité', syns: ['flexibilite', 'flexible', 'agilite', 'agile', 'polyvalence', 'polyvalent', 'adaptation', 'souplesse', 'reactivite', 'reactif', 'gestion du changement', 'changement', 'debrouillardise', 'debrouillard'], why: 'Terrain, imprévus, publics différents : je m\'ajuste vite et avec le sourire.', href: '#redbull' },
    { name: 'Dépassement de soi', syns: ['depassement', 'ambition', 'ambitieux', 'perseverance', 'perseverant', 'resilience', 'resilient', 'determination', 'determine', 'courage', 'courageux', 'travail', 'travailleur', 'effort', 'combativite', 'volonte', 'audace', 'audacieux', 'gout du defi', 'defi', 'challenge', 'tenacite', 'tenace', 'ne rien lacher', 'grinta', 'competitif', 'gagneur'], why: 'Victoire par TKO au premier round : la peur se travaille comme un muscle.', href: '#depassement' },
    { name: 'Transmettre', syns: ['transmission', 'pedagogie', 'pedagogue', 'partage', 'partager', 'enseigner', 'mentorat', 'former', 'formation', 'accompagnement', 'aider les autres', 'aider'], why: 'Ambassadeur UJM : donner envie à d\'autres de tenter l\'aventure.', href: '#ujm' },
    { name: 'Confiance', syns: ['deleguer', 'delegation', 'fiabilite', 'fiable', 'loyaute', 'loyal', 'honnetete', 'honnete', 'integrite', 'integre', 'autonomie', 'autonome', 'responsabilite', 'responsable', 'transparence', 'franchise', 'franc', 'droiture', 'sincerite', 'sincere', 'parole tenue'], why: 'Déléguer sans lâcher : la grande leçon de mon année de présidence.', href: '#bde' },
    { name: 'Contact humain', syns: ['contact', 'relationnel', 'communication', 'communicant', 'humain', 'sociabilite', 'sociable', 'relation', 'social', 'convivialite', 'networking', 'reseautage', 'aisance relationnelle', 'sens du contact', 'sympathie', 'sympathique', 'chaleureux', 'extraverti', 'charisme', 'charismatique'], why: 'Aller vers les gens et sentir l\'énergie d\'un groupe, c\'est ce que je préfère.', href: '#redbull' },
    { name: 'Vision stratégique', syns: ['vision', 'strategie', 'strategique', 'anticipation', 'anticiper', 'vision long terme', 'prise de decision', 'decision', 'esprit d entreprise', 'entrepreneuriat', 'entrepreneur', 'business', 'vision globale', 'hauteur de vue', 'priorisation', 'esprit de synthese', 'synthese'], why: 'Comprendre comment une entreprise crée vraiment de la valeur, avant d\'agir.', href: '#investissement' },
    { name: 'Lucidité', syns: ['recul', 'esprit critique', 'analyse', 'analytique', 'esprit d analyse', 'objectivite', 'objectif', 'pragmatisme', 'pragmatique', 'honnetete intellectuelle', 'realisme', 'realiste', 'discernement', 'bon sens', 'prise de recul', 'intelligence'], why: 'Accepter de me tromper, l\'assumer, et en tirer quelque chose.', href: '#depassement' }
  ];

  function normalize(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[''´`^]/g, ' ')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(function (w) { return w.length > 3 ? w.replace(/s$/, '') : w; })
      .join(' ');
  }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 99;
    var m = [], i, j;
    for (i = 0; i <= b.length; i++) { m[i] = [i]; }
    for (j = 0; j <= a.length; j++) { m[0][j] = j; }
    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1));
      }
    }
    return m[b.length][a.length];
  }
  function bigrams(s) { var r = [], i; for (i = 0; i < s.length - 1; i++) { r.push(s.substr(i, 2)); } return r; }
  function dice(a, b) {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    var A = bigrams(a), B = bigrams(b), inter = 0, used = {};
    A.forEach(function (x) {
      for (var i = 0; i < B.length; i++) { if (!used[i] && B[i] === x) { used[i] = 1; inter++; break; } }
    });
    return (2 * inter) / (A.length + B.length);
  }

  /* build the card grid */
  var found = 0, score = 0, shownScore = 0, streak = 0, missStreak = 0;
  VALUES.forEach(function (v, i) {
    v.norm = normalize(v.name);
    v.normSyns = v.syns.map(normalize);
    var card = document.createElement('div');
    card.className = 'vg-card';
    card.innerHTML =
      '<div class="vg-card-inner">' +
        '<div class="vg-face vg-front"><span class="vg-num">' + String(i + 1).padStart(2, '0') + '</span><span class="vg-q">?</span><span class="vg-letter"></span></div>' +
        '<div class="vg-face vg-back"><span class="vg-pts"></span><span class="vg-word">' + v.name + '</span><p>' + v.why + '</p><a href="' + v.href + '">Voir le chapitre →</a></div>' +
      '</div>';
    grid.appendChild(card);
    v.card = card;
  });

  /* entrance: cards cascade in as the section arrives (JS-only enhancement,
     the grid stays fully visible if anything here fails) */
  var reduceAll = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceAll && 'IntersectionObserver' in window) {
    try {
      grid.classList.add('vg-anim');
      var cardsArr = Array.prototype.slice.call(grid.children);
      cardsArr.forEach(function (c) {
        var f = c.querySelector('.vg-front');
        if (f) f.style.setProperty('--shd', (Math.random() * 5).toFixed(2) + 's');
      });
      var gridIo = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        gridIo.disconnect();
        /* deal the cards from the centre of the table, like a croupier */
        var gr = grid.getBoundingClientRect();
        var gcx = gr.left + gr.width / 2, gcy = gr.top + gr.height / 2;
        cardsArr.forEach(function (c, i) {
          var cr = c.getBoundingClientRect();
          c.style.setProperty('--dx', (gcx - (cr.left + cr.width / 2)).toFixed(0) + 'px');
          c.style.setProperty('--dy', (gcy - (cr.top + cr.height / 2)).toFixed(0) + 'px');
          c.style.setProperty('--dr', ((Math.random() - 0.5) * 24).toFixed(1) + 'deg');
          setTimeout(function () { c.classList.add('in'); }, 120 + i * 75);
        });
      }, { threshold: 0.12 });
      gridIo.observe(grid);
      /* absolute failsafe: never leave cards hidden */
      setTimeout(function () { cardsArr.forEach(function (c) { c.classList.add('in'); }); }, 6000);
    } catch (e) { grid.classList.remove('vg-anim'); }
  }

  /* soft parallax on the colour halos */
  if (!reduceAll) {
    var glowA = document.querySelector('.vg-glow-a');
    var glowB = document.querySelector('.vg-glow-b');
    var vgSec = document.querySelector('.vg-section');
    if (glowA && glowB && vgSec) {
      var vgDirty = true;
      window.addEventListener('scroll', function () { vgDirty = true; }, { passive: true });
      (function glowLoop() {
        if (vgDirty) {
          vgDirty = false;
          var r = vgSec.getBoundingClientRect();
          var vh = window.innerHeight || 800;
          if (r.bottom > 0 && r.top < vh) {
            var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
            glowA.style.transform = 'translateY(' + (p * 70).toFixed(1) + 'px)';
            glowB.style.transform = 'translateY(' + (p * -60).toFixed(1) + 'px)';
          }
        }
        requestAnimationFrame(glowLoop);
      })();
    }
  }

  /* ---------- particle VFX (canvas overlay) ---------- */
  var fxCanvas = null, fxCtx = null, fxParts = [], fxRunning = false;
  var reduceFx = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ensureFx() {
    if (fxCanvas) return;
    fxCanvas = document.createElement('canvas');
    fxCanvas.className = 'vg-fx';
    document.body.appendChild(fxCanvas);
    fxCtx = fxCanvas.getContext('2d');
    resizeFx();
    window.addEventListener('resize', resizeFx);
  }
  function resizeFx() { fxCanvas.width = window.innerWidth; fxCanvas.height = window.innerHeight; }
  function burst(x, y, n, colors) {
    if (reduceFx) return;
    ensureFx();
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7.5;
      fxParts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3.2,
        life: 0.9 + Math.random() * 0.5, size: 3.5 + Math.random() * 5.5,
        c: colors[i % colors.length], rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35
      });
    }
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(stepFx); }
  }
  function stepFx() {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    fxParts = fxParts.filter(function (p) { return p.life > 0; });
    fxParts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.26; p.vx *= 0.985; p.life -= 0.018; p.rot += p.vr;
      fxCtx.save();
      fxCtx.globalAlpha = Math.max(Math.min(p.life, 1), 0);
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rot);
      fxCtx.fillStyle = p.c;
      fxCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
      fxCtx.restore();
    });
    if (fxParts.length) { requestAnimationFrame(stepFx); }
    else { fxRunning = false; fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height); }
  }
  var FX_COLORS = ['#ff6b45', '#ffb930', '#3654ff', '#7ee2a8', '#ffffff'];
  function centerOf(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    if (r.bottom < 0 || r.top > vh) { r = input.getBoundingClientRect(); }
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function floatPts(el, text) {
    if (reduceFx) return;
    var c = centerOf(el);
    var f = document.createElement('div');
    f.className = 'vg-float';
    f.textContent = text;
    f.style.left = (c.x - 30 + (Math.random() - 0.5) * 40) + 'px';
    f.style.top = (c.y - 20) + 'px';
    document.body.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1200);
  }

  /* ---------- HUD ---------- */
  var LEVELS = [[0, 'Niv. 1 · Observateur'], [4, 'Niv. 2 · Analyste'], [8, 'Niv. 3 · Chasseur de talents'], [12, 'Niv. 4 · DRH d\'élite'], [16, 'Niv. MAX · Match parfait']];
  function levelName() {
    var name = LEVELS[0][1];
    LEVELS.forEach(function (l) { if (found >= l[0]) name = l[1]; });
    return name;
  }
  function percentile() {
    return Math.min(99, Math.round(16 + found * 4.3 + Math.min(score, 1400) / 60));
  }
  function animateScore() {
    var from = shownScore, to = score, t0 = performance.now();
    (function step(now) {
      var p = Math.min((now - t0) / 600, 1);
      var e = 1 - Math.pow(1 - p, 3);
      shownScore = Math.round(from + (to - from) * e);
      if (scoreEl) scoreEl.textContent = shownScore;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  function updateHud() {
    if (foundEl) foundEl.textContent = found + '/' + VALUES.length;
    if (barEl) barEl.style.width = (found / VALUES.length * 100) + '%';
    if (levelEl) levelEl.textContent = levelName();
    if (rankEl) rankEl.textContent = found > 0 ? 'Top ' + Math.max(100 - percentile(), 1) + ' %' : '···';
    animateScore();
  }
  function setFeedback(msg, cls) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.className = 'vg-feedback' + (cls ? ' ' + cls : '');
  }

  function revealCard(v, pts, exact) {
    v.found = true;
    found++;
    v.card.classList.add('found', 'flash');
    if (exact) v.card.classList.add('exact');
    var ptsEl = v.card.querySelector('.vg-pts');
    if (ptsEl && pts) ptsEl.textContent = '+' + pts + ' pts';
    setTimeout(function () { v.card.classList.remove('flash'); }, 650);
    var c = centerOf(v.card);
    burst(c.x, c.y, exact ? 42 : 26, FX_COLORS);
    if (pts) floatPts(v.card, '+' + pts);
  }
  /* ---------- hints: three per game, via the Indice button ---------- */
  var hintsLeft = 3;
  var hintBtn = document.getElementById('vgHint');
  var hintCountEl = document.getElementById('vgHintCount');
  function useHint() {
    if (hintsLeft <= 0) return;
    var left = VALUES.filter(function (v) { return !v.found && !v.hintShown; });
    if (!left.length) { setFeedback('Toutes les cartes restantes portent déjà leur indice.', ''); return; }
    hintsLeft--;
    if (hintCountEl) hintCountEl.textContent = hintsLeft;
    if (hintBtn) {
      hintBtn.classList.remove('sparkle');
      if (hintsLeft === 0) hintBtn.classList.add('used');
    }
    var pick = left[Math.floor(Math.random() * left.length)];
    pick.hintShown = true;
    var letterEl = pick.card.querySelector('.vg-letter');
    if (letterEl) letterEl.textContent = 'Indice : « ' + pick.name.charAt(0) + '… »';
    pick.card.classList.remove('peek');
    void pick.card.offsetWidth;
    pick.card.classList.add('peek');
    setFeedback('Indice : une des cartes commence par « ' + pick.name.charAt(0) + ' ». Il te reste ' + hintsLeft + ' indice' + (hintsLeft > 1 ? 's' : '') + '.', '');
  }
  if (hintBtn) hintBtn.addEventListener('click', useHint);

  /* gentle pause toast, shown once */
  var toastShown = false;
  function showPauseToast() {
    if (toastShown) return;
    toastShown = true;
    var t = document.createElement('div');
    t.className = 'vg-toast';
    t.textContent = 'Pas de pression : continue d\'explorer le site et reviens finir le jeu quand tu veux. Le bouton Indice est là si tu bloques.';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 500);
    }, 7500);
  }

  /* ---------- generous matcher: exact > synonym > fuzzy > association ---------- */
  function bestMatch(guess) {
    var i, j, v;
    for (i = 0; i < VALUES.length; i++) {
      if (VALUES[i].norm === guess) return { v: VALUES[i], tier: 1 };
    }
    for (i = 0; i < VALUES.length; i++) {
      if (VALUES[i].normSyns.indexOf(guess) !== -1) return { v: VALUES[i], tier: 2 };
    }
    var best = null, bestScore = 0;
    for (i = 0; i < VALUES.length; i++) {
      v = VALUES[i];
      var cands = [v.norm].concat(v.normSyns);
      for (j = 0; j < cands.length; j++) {
        var d = dice(guess, cands[j]);
        if (guess.length >= 5 && cands[j].length >= 5 && lev(guess, cands[j]) <= 2) d = Math.max(d, 0.9);
        if (cands[j].indexOf(guess) === 0 && guess.length >= 4) d = Math.max(d, 0.8);
        if (d > bestScore) { bestScore = d; best = v; }
      }
    }
    if (best && bestScore >= 0.62) return { v: best, tier: 3 };
    if (best && bestScore >= 0.42) return { v: best, tier: 4 };
    lastMissScore = bestScore;
    return null;
  }
  var lastMissScore = 0;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = input.value.trim();
    var guess = normalize(raw);
    input.value = '';
    if (!guess) return;
    var m = bestMatch(guess);

    if (m && m.v.found) {
      setFeedback('« ' + m.v.name + ' » est déjà retournée, on pense pareil. Tente une carte encore cachée !', '');
      return;
    }
    if (!m) {
      missStreak++;
      streak = 0;
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
      setFeedback('Je ne vois pas encore le lien avec « ' + raw + ' »… vise un trait humain (écoute, rigueur, audace, vision).', 'miss');
      if (missStreak >= 2 || lastMissScore < 0.2) {
        if (hintBtn && hintsLeft > 0) hintBtn.classList.add('sparkle');
        showPauseToast();
      }
      return;
    }

    missStreak = 0;
    streak++;
    if (hintBtn) hintBtn.classList.remove('sparkle');
    var base = m.tier === 1 ? 100 : m.tier === 2 ? 80 : m.tier === 3 ? 60 : 40;
    var combo = streak >= 3;
    var pts = combo ? Math.round(base * 1.5) : base;
    score += pts;
    revealCard(m.v, pts, m.tier === 1);
    updateHud();

    var comboTxt = combo ? ' Combo ×1,5 !' : '';
    var rankTxt = ' Tu fais mieux que ' + percentile() + ' % des visiteurs.';
    if (found === VALUES.length) {
      setFeedback('Seize sur seize, ' + score + ' pts, top ' + Math.max(100 - percentile(), 1) + ' % des visiteurs. On est faits pour s\'entendre : descends jusqu\'au contact !', 'ok');
      var c = centerOf(form);
      burst(c.x, c.y, 90, FX_COLORS);
    } else if (m.tier === 1) {
      setFeedback('En plein dans le mille : « ' + m.v.name + ' » (+' + pts + ' pts).' + comboTxt + rankTxt, 'ok');
    } else if (m.tier === 2) {
      setFeedback('Ça me ressemble : je range « ' + raw + ' » avec « ' + m.v.name + ' » (+' + pts + ' pts).' + comboTxt + rankTxt, 'ok');
    } else if (m.tier === 3) {
      setFeedback('Bien vu, ça rejoint « ' + m.v.name + ' » chez moi (+' + pts + ' pts).' + comboTxt + rankTxt, 'ok');
    } else {
      setFeedback('Je vois l\'idée : pour moi, ça touche à « ' + m.v.name + ' » (+' + pts + ' pts).' + comboTxt + rankTxt, 'ok');
    }
  });

  var revealedAll = false;
  if (revealBtn) {
    revealBtn.addEventListener('click', function () {
      revealedAll = true;
      VALUES.forEach(function (v) { if (!v.found) { v.found = true; found++; v.card.classList.add('found'); } });
      updateHud();
      setFeedback('Les seize valeurs sont révélées. Clique sur une carte pour explorer le chapitre associé.', '');
    });
  }

  /* card links are injected after load: route them through Lenis */
  grid.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (window.__lenis) window.__lenis.scrollTo(target, { offset: -74, duration: 1.5 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------- cinematic table ---------- */
  var finePointerVg = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var board = document.querySelector('.vg-board');

  /* spotlight following the cursor across the table */
  if (board && finePointerVg && !reduceFx) {
    var spot = document.createElement('div');
    spot.className = 'vg-spot';
    board.appendChild(spot);
    board.addEventListener('mousemove', function (e) {
      var r = board.getBoundingClientRect();
      spot.style.setProperty('--sx', (e.clientX - r.left + 30) + 'px');
      spot.style.setProperty('--sy', (e.clientY - r.top + 30) + 'px');
      board.classList.add('lit');
    });
    board.addEventListener('mouseleave', function () { board.classList.remove('lit'); });
  }

  /* 3D tilt under the cursor */
  if (finePointerVg && !reduceFx) {
    VALUES.forEach(function (v) {
      var card = v.card;
      card.addEventListener('mousemove', function (e) {
        if (grid.classList.contains('vg-anim') && !card.classList.contains('in')) return;
        var r = card.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -9;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 9;
        card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform .5s var(--ease)';
        card.style.transform = '';
        setTimeout(function () { card.style.transition = ''; }, 500);
      });
    });
  }

  /* tapping a hidden card whispers its first letter */
  VALUES.forEach(function (v) {
    v.card.addEventListener('click', function (e) {
      if (v.found || e.target.closest('a')) return;
      v.hintShown = true;
      var letterEl = v.card.querySelector('.vg-letter');
      if (letterEl) letterEl.textContent = 'Indice : « ' + v.name.charAt(0) + '… »';
      v.card.classList.remove('peek');
      void v.card.offsetWidth;
      v.card.classList.add('peek');
      setFeedback('Cette carte commence par « ' + v.name.charAt(0) + ' ». À toi de jouer.', '');
      if (input && finePointerVg) input.focus();
    });
  });

  /* level-up flash */
  var lvlOverlay = null, lastLevelIdx = 0;
  function levelIdx() { return found >= 12 ? 3 : found >= 8 ? 2 : found >= 4 ? 1 : 0; }
  function showLevelUp(text) {
    if (reduceFx) return;
    if (!lvlOverlay) {
      lvlOverlay = document.createElement('div');
      lvlOverlay.className = 'vg-levelup';
      lvlOverlay.innerHTML = '<div class="vg-lvl-text"></div>';
      document.body.appendChild(lvlOverlay);
    }
    lvlOverlay.querySelector('.vg-lvl-text').textContent = text;
    lvlOverlay.classList.remove('show');
    void lvlOverlay.offsetWidth;
    lvlOverlay.classList.add('show');
  }

  /* grand finale at 16/16 */
  var finalShown = false;
  function showFinale() {
    if (finalShown) return;
    finalShown = true;
    var overlay = document.createElement('div');
    overlay.className = 'vg-final';
    var card = document.createElement('div');
    card.className = 'vg-final-card';
    var close = document.createElement('button');
    close.className = 'vg-final-close';
    close.setAttribute('aria-label', 'Fermer');
    close.textContent = '\u00d7';
    var eyebrow = document.createElement('span');
    eyebrow.className = 'vg-final-eyebrow';
    eyebrow.textContent = 'Seize sur seize';
    var h = document.createElement('h4');
    h.textContent = 'Match parfait.';
    var p = document.createElement('p');
    p.innerHTML = 'Tu viens de dresser mon portrait en <span class="vg-final-score">' + score + ' pts</span>, top ' + Math.max(100 - percentile(), 1) + ' % des visiteurs. Si mes valeurs te parlent autant, on devrait discuter.';
    var cta = document.createElement('a');
    cta.className = 'btn btn-primary';
    cta.href = '#contact';
    cta.textContent = 'Discutons-en';
    card.appendChild(close); card.appendChild(eyebrow); card.appendChild(h); card.appendChild(p); card.appendChild(cta);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    function killOverlay() { overlay.classList.remove('show'); setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 300); }
    close.addEventListener('click', killOverlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) killOverlay(); });
    cta.addEventListener('click', function (e) {
      e.preventDefault();
      killOverlay();
      var t = document.querySelector('#contact');
      if (window.__lenis) window.__lenis.scrollTo(t, { offset: -74, duration: 1.5 });
      else t.scrollIntoView({ behavior: 'smooth' });
    });
    overlay.classList.add('show');
    var c = centerOf(form);
    burst(c.x, c.y, 60, FX_COLORS);
    setTimeout(function () { burst(window.innerWidth * 0.3, window.innerHeight * 0.35, 45, FX_COLORS); }, 350);
    setTimeout(function () { burst(window.innerWidth * 0.7, window.innerHeight * 0.3, 45, FX_COLORS); }, 700);
  }

  /* hook level-up + finale into the HUD updates */
  var baseUpdateHud = updateHud;
  updateHud = function () {
    baseUpdateHud();
    var idx = levelIdx();
    if (idx > lastLevelIdx && found < VALUES.length) {
      lastLevelIdx = idx;
      showLevelUp(levelName());
    }
    if (found === VALUES.length && !finalShown && !revealedAll) {
      setTimeout(showFinale, 900);
    }
  };
})();
