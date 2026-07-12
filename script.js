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
    lightboxContent.innerHTML = '<img src="' + src + '" alt="' + (alt || '').replace(/"/g, '') + '">';
    lightbox.classList.add('open');
  }
  function openLightboxVideo(src, poster) {
    lightboxContent.innerHTML = '<video src="' + src + '" poster="' + (poster || '') + '" controls autoplay playsinline></video>';
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

  /* ---------- KO flash overlay (boxing hero video loops every ~8s) ----------
     A subtle teaser builds anticipation early in the loop, then the big
     swirling K.O. badge pops right on the beat, ~2s before the loop restarts. */
  var koFlash = document.getElementById('koFlash');
  var koTeaser = document.getElementById('koTeaser');
  if (koFlash) {
    var KO_LOOP_MS = 8000;   // durée de la boucle vidéo
    var TEASE_AT = 1200;     // apparition du teaser, tôt dans la boucle
    var KO_AT = 6000;        // le K.O. arrive ~2s avant la fin (8s)
    var KO_HIDE_AT = 7700;   // masquage juste avant la reprise en boucle
    function cycleKoFlash() {
      if (koTeaser) {
        setTimeout(function () { koTeaser.classList.add('show'); }, TEASE_AT);
      }
      setTimeout(function () {
        if (koTeaser) koTeaser.classList.remove('show');
        koFlash.classList.remove('show');
        void koFlash.offsetWidth; /* force reflow so the swirl-in animation replays every loop */
        koFlash.classList.add('show');
      }, KO_AT);
      setTimeout(function () { koFlash.classList.remove('show'); }, KO_HIDE_AT);
    }
    cycleKoFlash();
    setInterval(cycleKoFlash, KO_LOOP_MS);
  }

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
      if (fjordPhotoEl) fjordPhotoEl.style.opacity = 1;
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
